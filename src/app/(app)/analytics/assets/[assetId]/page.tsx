import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import {
  EMPTY_ANALYTICS_TOTALS,
  addAnalyticsMetricRow,
  analyticsConversionRate,
  analyticsQueryString,
  formatAnalyticsCurrency,
  formatAnalyticsDateTime,
  formatAnalyticsInteger,
  resolveAnalyticsDateRange,
  resolveAnalyticsSourceFilter,
  safeAnalyticsNumber,
  type AnalyticsDailyMetricRow,
  type AnalyticsMetricTotals,
} from "@/lib/analytics/reporting";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import styles from "../../Analytics.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ assetId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type EventRow = {
  id: string;
  event_name: string;
  occurred_at: string;
  channel: string | null;
  traffic_source: string | null;
  value: number | string | null;
  currency_code: string | null;
};

export default async function AnalyticsAssetPage({ params, searchParams }: PageProps) {
  const { assetId } = await params;
  const resolvedSearchParams: Record<string, string | string[] | undefined> =
    searchParams ? await searchParams : {};
  const range = resolveAnalyticsDateRange(resolvedSearchParams.days);
  const sourceFilter = resolveAnalyticsSourceFilter(resolvedSearchParams.source);
  const supabase = untypedSupabase(await createClient());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const accountId = accountContext.activeAccountId;
  if (!accountId) redirect("/accounts");

  const { data: asset, error: assetError } = await supabase
    .from("generated_assets")
    .select("id,title,asset_type,status,campaign_id,created_at")
    .eq("id", assetId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (assetError) throw new Error(assetError.message);
  if (!asset) notFound();

  const [{ data: campaign }, { data: sourcesData }] = await Promise.all([
    asset.campaign_id
      ? supabase.from("campaigns").select("id,name").eq("id", asset.campaign_id).eq("account_id", accountId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("analytics_data_sources").select("id,source_type").eq("account_id", accountId),
  ]);
  const sourceIds = ((sourcesData ?? []) as Array<{ id: string; source_type: string }>)
    .filter((source) => sourceFilter === "all" || source.source_type === sourceFilter)
    .map((source) => source.id);

  let metricQuery = supabase
    .from("analytics_daily_metrics")
    .select("source_id,metric_date,campaign_id,asset_id,channel,traffic_source,traffic_medium,users_count,sessions_count,engaged_sessions_count,page_views_count,leads_count,conversions_count,revenue")
    .eq("account_id", accountId)
    .eq("asset_id", assetId)
    .gte("metric_date", range.startDate)
    .lte("metric_date", range.endDate)
    .order("metric_date", { ascending: true });
  if (sourceFilter !== "all") metricQuery = metricQuery.in("source_id", sourceIds);

  const [metricsResult, eventsResult] = await Promise.all([
    sourceFilter !== "all" && !sourceIds.length ? Promise.resolve({ data: [], error: null }) : metricQuery,
    supabase
      .from("analytics_events")
      .select("id,event_name,occurred_at,channel,traffic_source,value,currency_code")
      .eq("account_id", accountId)
      .eq("asset_id", assetId)
      .gte("occurred_at", `${range.startDate}T00:00:00.000Z`)
      .order("occurred_at", { ascending: false })
      .limit(40),
  ]);
  if (metricsResult.error) throw new Error(metricsResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const metrics = (metricsResult.data ?? []) as AnalyticsDailyMetricRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const totals = metrics.reduce(addAnalyticsMetricRow, EMPTY_ANALYTICS_TOTALS);
  const channelMap = new Map<string, AnalyticsMetricTotals>();
  metrics.forEach((row) => {
    const channel = row.channel?.trim() || "Unattributed";
    channelMap.set(channel, addAnalyticsMetricRow(channelMap.get(channel) ?? EMPTY_ANALYTICS_TOTALS, row));
  });
  const channels = Array.from(channelMap.entries())
    .map(([channel, performance]) => ({ channel, performance }))
    .sort((a, b) => b.performance.sessions - a.performance.sessions);
  const queryString = analyticsQueryString({ days: range.days, source: sourceFilter });
  const assetTitle = asset.title || `${asset.asset_type || "Generated"} asset`;

  return (
    <main className={styles.page}>
      <section className={styles.detailHero}>
        <div>
          {campaign ? <Link href={`/analytics/campaigns/${campaign.id}?${queryString}`} className={styles.backLink}>← {campaign.name}</Link> : <Link href={`/analytics?${queryString}`} className={styles.backLink}>← Analytics</Link>}
          <p className={styles.eyebrow}>Asset performance</p>
          <h1>{assetTitle}</h1>
          <p>{asset.asset_type || "Asset"} · {range.label}</p>
        </div>
        <span className={styles.panelPill}>{asset.status || "Unknown status"}</span>
      </section>

      <form className={styles.filterBar} method="get">
        <div><label htmlFor="asset-days">Reporting window</label><select id="asset-days" name="days" defaultValue={String(range.days)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
        <div><label htmlFor="asset-source">Data source</label><select id="asset-source" name="source" defaultValue={sourceFilter}><option value="all">All sources</option><option value="native">Marketing VIP Native</option><option value="ga4">Google Analytics 4</option></select></div>
        <button type="submit" className={styles.secondaryButton}>Apply Filters</button>
      </form>

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}><p>Sessions</p><strong>{formatAnalyticsInteger(totals.sessions)}</strong><span>{formatAnalyticsInteger(totals.pageViews)} page views</span></article>
        <article className={styles.metricCard}><p>Leads</p><strong>{formatAnalyticsInteger(totals.leads)}</strong><span>Attributed lead actions</span></article>
        <article className={styles.metricCard}><p>Conversions</p><strong>{formatAnalyticsInteger(totals.conversions)}</strong><span>{analyticsConversionRate(totals).toFixed(1)}% conversion rate</span></article>
        <article className={styles.metricCard}><p>Revenue</p><strong>{formatAnalyticsCurrency(totals.revenue)}</strong><span>Attributed value</span></article>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Channels</p><h2>Asset acquisition mix</h2></div></div>
          {channels.length ? (
            <div className={styles.channelTable}>
              <div className={styles.channelHeader}><span>Channel</span><span>Sessions</span><span>Leads</span><span>Conversions</span></div>
              {channels.map((row) => <div key={row.channel} className={styles.channelRow}><strong>{row.channel}</strong><span>{formatAnalyticsInteger(row.performance.sessions)}</span><span>{formatAnalyticsInteger(row.performance.leads)}</span><span>{formatAnalyticsInteger(row.performance.conversions)}</span></div>)}
            </div>
          ) : <div className={styles.emptyState}><strong>No attributed channel data yet.</strong></div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Interpretation</p><h2>What this view proves</h2></div></div>
          <div className={styles.insightBox}>
            <p>This page isolates performance recorded with this asset’s Marketing VIP identifier. GA4 account-level traffic remains visible on the main dashboard, while asset attribution depends on the native tracking parameter.</p>
            <p>Eligible publishing links use that identifier to preserve asset-level attribution.</p>
          </div>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Native activity</p><h2>Recent asset events</h2></div><span className={styles.panelPill}>{events.length} shown</span></div>
        {events.length ? (
          <div className={styles.eventTimeline}>
            {events.map((event) => (
              <article key={event.id}>
                <div><strong>{event.event_name.replaceAll("_", " ")}</strong><span>{event.channel || event.traffic_source || "Unattributed"}</span></div>
                <div><span>{formatAnalyticsDateTime(event.occurred_at)}</span>{safeAnalyticsNumber(event.value) ? <strong>{formatAnalyticsCurrency(safeAnalyticsNumber(event.value), event.currency_code || "USD")}</strong> : null}</div>
              </article>
            ))}
          </div>
        ) : <div className={styles.emptyState}><strong>No native asset events in this window.</strong></div>}
      </section>
    </main>
  );
}
