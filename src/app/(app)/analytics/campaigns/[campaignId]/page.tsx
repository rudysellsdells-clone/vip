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
  params: Promise<{ campaignId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type AssetRow = { id: string; title: string | null; asset_type: string | null; status: string | null };
type EventRow = {
  id: string;
  event_name: string;
  occurred_at: string;
  asset_id: string | null;
  channel: string | null;
  traffic_source: string | null;
  value: number | string | null;
  currency_code: string | null;
};

function totalsByAsset(metrics: AnalyticsDailyMetricRow[]) {
  const map = new Map<string, AnalyticsMetricTotals>();
  metrics.forEach((row) => {
    if (!row.asset_id) return;
    map.set(row.asset_id, addAnalyticsMetricRow(map.get(row.asset_id) ?? EMPTY_ANALYTICS_TOTALS, row));
  });
  return map;
}

export default async function AnalyticsCampaignPage({ params, searchParams }: PageProps) {
  const { campaignId } = await params;
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

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,name,status,buyer_segment,created_at")
    .eq("id", campaignId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (campaignError) throw new Error(campaignError.message);
  if (!campaign) notFound();

  const { data: sourcesData } = await supabase
    .from("analytics_data_sources")
    .select("id,source_type")
    .eq("account_id", accountId);
  const sourceIds = ((sourcesData ?? []) as Array<{ id: string; source_type: string }>)
    .filter((source) => sourceFilter === "all" || source.source_type === sourceFilter)
    .map((source) => source.id);

  let metricQuery = supabase
    .from("analytics_daily_metrics")
    .select("source_id,metric_date,campaign_id,asset_id,channel,traffic_source,traffic_medium,users_count,sessions_count,engaged_sessions_count,page_views_count,leads_count,conversions_count,revenue")
    .eq("account_id", accountId)
    .eq("campaign_id", campaignId)
    .gte("metric_date", range.startDate)
    .lte("metric_date", range.endDate)
    .order("metric_date", { ascending: true });
  if (sourceFilter !== "all") metricQuery = metricQuery.in("source_id", sourceIds);

  const [metricsResult, assetsResult, eventsResult] = await Promise.all([
    sourceFilter !== "all" && !sourceIds.length ? Promise.resolve({ data: [], error: null }) : metricQuery,
    supabase
      .from("generated_assets")
      .select("id,title,asset_type,status")
      .eq("account_id", accountId)
      .eq("campaign_id", campaignId)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("analytics_events")
      .select("id,event_name,occurred_at,asset_id,channel,traffic_source,value,currency_code")
      .eq("account_id", accountId)
      .eq("campaign_id", campaignId)
      .gte("occurred_at", `${range.startDate}T00:00:00.000Z`)
      .order("occurred_at", { ascending: false })
      .limit(30),
  ]);

  if (metricsResult.error) throw new Error(metricsResult.error.message);
  if (assetsResult.error) throw new Error(assetsResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const metrics = (metricsResult.data ?? []) as AnalyticsDailyMetricRow[];
  const assets = (assetsResult.data ?? []) as AssetRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const totals = metrics.reduce(addAnalyticsMetricRow, EMPTY_ANALYTICS_TOTALS);
  const assetTotals = totalsByAsset(metrics);
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const assetPerformance = Array.from(assetTotals.entries())
    .map(([id, performance]) => ({
      id,
      title: assetMap.get(id)?.title ?? `${assetMap.get(id)?.asset_type ?? "Generated"} asset`,
      assetType: assetMap.get(id)?.asset_type ?? "asset",
      performance,
    }))
    .sort((a, b) => b.performance.conversions - a.performance.conversions || b.performance.sessions - a.performance.sessions);
  const channelMap = new Map<string, AnalyticsMetricTotals>();
  metrics.forEach((row) => {
    const channel = row.channel?.trim() || "Unattributed";
    channelMap.set(channel, addAnalyticsMetricRow(channelMap.get(channel) ?? EMPTY_ANALYTICS_TOTALS, row));
  });
  const channels = Array.from(channelMap.entries())
    .map(([channel, performance]) => ({ channel, performance }))
    .sort((a, b) => b.performance.sessions - a.performance.sessions);
  const queryString = analyticsQueryString({ days: range.days, source: sourceFilter });

  return (
    <main className={styles.page}>
      <section className={styles.detailHero}>
        <div>
          <Link href={`/analytics?${queryString}`} className={styles.backLink}>← Analytics</Link>
          <p className={styles.eyebrow}>Campaign performance</p>
          <h1>{campaign.name}</h1>
          <p>{campaign.buyer_segment || "No buyer segment assigned"} · {range.label}</p>
        </div>
        <span className={styles.panelPill}>{campaign.status || "Unknown status"}</span>
      </section>

      <form className={styles.filterBar} method="get">
        <div><label htmlFor="campaign-days">Reporting window</label><select id="campaign-days" name="days" defaultValue={String(range.days)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
        <div><label htmlFor="campaign-source">Data source</label><select id="campaign-source" name="source" defaultValue={sourceFilter}><option value="all">All sources</option><option value="native">Marketing VIP Native</option><option value="ga4">Google Analytics 4</option></select></div>
        <button type="submit" className={styles.secondaryButton}>Apply Filters</button>
      </form>

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}><p>Sessions</p><strong>{formatAnalyticsInteger(totals.sessions)}</strong><span>{formatAnalyticsInteger(totals.pageViews)} page views</span></article>
        <article className={styles.metricCard}><p>Leads</p><strong>{formatAnalyticsInteger(totals.leads)}</strong><span>Tracked lead outcomes</span></article>
        <article className={styles.metricCard}><p>Conversions</p><strong>{formatAnalyticsInteger(totals.conversions)}</strong><span>{analyticsConversionRate(totals).toFixed(1)}% conversion rate</span></article>
        <article className={styles.metricCard}><p>Revenue</p><strong>{formatAnalyticsCurrency(totals.revenue)}</strong><span>Attributed value</span></article>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Asset breakdown</p><h2>Content driving this campaign</h2></div></div>
          {assetPerformance.length ? (
            <div className={styles.performanceTable}>
              <div className={styles.performanceHeader}><span>Asset</span><span>Sessions</span><span>Conversions</span><span>Revenue</span></div>
              {assetPerformance.map((row) => (
                <Link key={row.id} href={`/analytics/assets/${row.id}?${queryString}`} className={styles.performanceRow}><strong>{row.title}<small>{row.assetType}</small></strong><span>{formatAnalyticsInteger(row.performance.sessions)}</span><span>{formatAnalyticsInteger(row.performance.conversions)}</span><span>{formatAnalyticsCurrency(row.performance.revenue)}</span></Link>
              ))}
            </div>
          ) : <div className={styles.emptyState}><strong>No asset attribution yet.</strong><p>{assets.length} assets belong to this campaign, but none have attributed reporting in this view.</p></div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Channels</p><h2>Where performance came from</h2></div></div>
          {channels.length ? (
            <div className={styles.channelTable}>
              <div className={styles.channelHeader}><span>Channel</span><span>Sessions</span><span>Leads</span><span>Conversions</span></div>
              {channels.map((row) => <div key={row.channel} className={styles.channelRow}><strong>{row.channel}</strong><span>{formatAnalyticsInteger(row.performance.sessions)}</span><span>{formatAnalyticsInteger(row.performance.leads)}</span><span>{formatAnalyticsInteger(row.performance.conversions)}</span></div>)}
            </div>
          ) : <div className={styles.emptyState}><strong>No channel data yet.</strong></div>}
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Native activity</p><h2>Recent attributed events</h2></div><span className={styles.panelPill}>{events.length} shown</span></div>
        {events.length ? (
          <div className={styles.eventTimeline}>
            {events.map((event) => (
              <article key={event.id}>
                <div><strong>{event.event_name.replaceAll("_", " ")}</strong><span>{event.channel || event.traffic_source || "Unattributed"}</span></div>
                <div><span>{formatAnalyticsDateTime(event.occurred_at)}</span>{safeAnalyticsNumber(event.value) ? <strong>{formatAnalyticsCurrency(safeAnalyticsNumber(event.value), event.currency_code || "USD")}</strong> : null}</div>
              </article>
            ))}
          </div>
        ) : <div className={styles.emptyState}><strong>No native campaign events in this window.</strong></div>}
      </section>
    </main>
  );
}
