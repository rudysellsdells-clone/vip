import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { ANALYTICS_EVENT_DEFINITIONS } from "@/lib/analytics/event-taxonomy";
import { googleAnalyticsOAuthIsConfigured } from "@/lib/analytics/google";
import {
  EMPTY_ANALYTICS_TOTALS,
  addAnalyticsMetricRow,
  analyticsConversionRate,
  analyticsEngagementRate,
  analyticsQueryString,
  dateKey,
  formatAnalyticsCurrency,
  formatAnalyticsDateTime,
  formatAnalyticsInteger,
  resolveAnalyticsDateRange,
  resolveAnalyticsSourceFilter,
  safeAnalyticsNumber,
  type AnalyticsDailyMetricRow,
  type AnalyticsMetricTotals,
} from "@/lib/analytics/reporting";
import {
  AnalyticsSetupPanel,
  type AnalyticsPropertyOption,
} from "@/components/analytics/AnalyticsSetupPanel";
import {
  AnalyticsGoalsPanel,
  type AnalyticsGoalView,
} from "@/components/analytics/AnalyticsGoalsPanel";
import {
  AnalyticsOperationsPanel,
  type AnalyticsSyncRunView,
} from "@/components/analytics/AnalyticsOperationsPanel";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import styles from "./Analytics.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DataSourceRow = {
  id: string;
  source_type: "native" | "ga4";
  status: "draft" | "connecting" | "active" | "paused" | "error";
  name: string;
  website_url: string | null;
  external_property_id: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  collection_key: string | null;
  key_rotated_at: string | null;
  auto_sync_enabled: boolean;
  sync_frequency: string;
  next_sync_at: string | null;
  settings: Record<string, unknown> | null;
};

type GoalRow = {
  id: string;
  name: string;
  description: string | null;
  event_name: string;
  goal_type: string;
  is_primary: boolean;
  is_active: boolean;
  default_value: number | string | null;
  currency_code: string;
};

type SyncRunRow = {
  id: string;
  source_id: string | null;
  source_type: "native" | "ga4";
  trigger_type: string;
  status: "running" | "completed" | "failed";
  start_date: string;
  end_date: string;
  rows_processed: number | string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

type CampaignRow = { id: string; name: string; status: string | null };
type AssetRow = {
  id: string;
  title: string | null;
  asset_type: string | null;
  status: string | null;
  campaign_id: string | null;
};

function statusLabel(status: DataSourceRow["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function totalsByIdentifier(
  metrics: AnalyticsDailyMetricRow[],
  key: "campaign_id" | "asset_id",
) {
  const map = new Map<string, AnalyticsMetricTotals>();
  metrics.forEach((row) => {
    const identifier = row[key];
    if (!identifier) return;
    map.set(identifier, addAnalyticsMetricRow(map.get(identifier) ?? EMPTY_ANALYTICS_TOTALS, row));
  });
  return map;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const range = resolveAnalyticsDateRange(resolvedSearchParams.days);
  const sourceFilter = resolveAnalyticsSourceFilter(resolvedSearchParams.source);
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;
  if (!activeAccountId) redirect("/accounts");

  const sourcesResult = await supabase
    .from("analytics_data_sources")
    .select(
      "id,source_type,status,name,website_url,external_property_id,last_synced_at,last_error,collection_key,key_rotated_at,auto_sync_enabled,sync_frequency,next_sync_at,settings",
    )
    .eq("account_id", activeAccountId)
    .order("created_at", { ascending: true });

  const sources = (sourcesResult.data ?? []) as DataSourceRow[];
  const filteredSourceIds = sources
    .filter((source) => sourceFilter === "all" || source.source_type === sourceFilter)
    .map((source) => source.id);

  let metricsResult: { data: unknown[] | null; error: { message?: string } | null } = {
    data: [],
    error: null,
  };

  if (sourceFilter === "all" || filteredSourceIds.length) {
    let metricsQuery = supabase
      .from("analytics_daily_metrics")
      .select(
        "source_id,metric_date,campaign_id,asset_id,channel,traffic_source,traffic_medium,users_count,sessions_count,engaged_sessions_count,page_views_count,leads_count,conversions_count,revenue",
      )
      .eq("account_id", activeAccountId)
      .gte("metric_date", range.startDate)
      .lte("metric_date", range.endDate)
      .order("metric_date", { ascending: true });

    if (sourceFilter !== "all") metricsQuery = metricsQuery.in("source_id", filteredSourceIds);
    metricsResult = await metricsQuery;
  }

  const [goalsResult, syncRunsResult] = await Promise.all([
    supabase
      .from("analytics_goals")
      .select(
        "id,name,description,event_name,goal_type,is_primary,is_active,default_value,currency_code",
      )
      .eq("account_id", activeAccountId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("analytics_sync_runs")
      .select(
        "id,source_id,source_type,trigger_type,status,start_date,end_date,rows_processed,error_message,started_at,completed_at",
      )
      .eq("account_id", activeAccountId)
      .order("started_at", { ascending: false })
      .limit(12),
  ]);

  const schemaReady =
    !sourcesResult.error && !metricsResult.error && !goalsResult.error && !syncRunsResult.error;
  const metrics = (metricsResult.data ?? []) as AnalyticsDailyMetricRow[];
  const goals = (goalsResult.data ?? []) as GoalRow[];
  const syncRuns = (syncRunsResult.data ?? []) as SyncRunRow[];
  const totals = metrics.reduce(addAnalyticsMetricRow, EMPTY_ANALYTICS_TOTALS);

  const campaignTotals = totalsByIdentifier(metrics, "campaign_id");
  const assetTotals = totalsByIdentifier(metrics, "asset_id");
  const campaignIds = Array.from(campaignTotals.keys());
  const assetIds = Array.from(assetTotals.keys());

  const [campaignsResult, assetsResult] = await Promise.all([
    campaignIds.length
      ? supabase
          .from("campaigns")
          .select("id,name,status")
          .eq("account_id", activeAccountId)
          .in("id", campaignIds)
      : Promise.resolve({ data: [], error: null }),
    assetIds.length
      ? supabase
          .from("generated_assets")
          .select("id,title,asset_type,status,campaign_id")
          .eq("account_id", activeAccountId)
          .in("id", assetIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const campaignMap = new Map(
    ((campaignsResult.data ?? []) as CampaignRow[]).map((campaign) => [campaign.id, campaign]),
  );
  const assetMap = new Map(
    ((assetsResult.data ?? []) as AssetRow[]).map((asset) => [asset.id, asset]),
  );
  const queryString = analyticsQueryString({ days: range.days, source: sourceFilter });

  const campaignPerformance = Array.from(campaignTotals.entries())
    .map(([id, performance]) => ({
      id,
      name: campaignMap.get(id)?.name ?? "Unknown campaign",
      status: campaignMap.get(id)?.status ?? null,
      performance,
    }))
    .sort((a, b) => b.performance.conversions - a.performance.conversions || b.performance.sessions - a.performance.sessions)
    .slice(0, 10);

  const assetPerformance = Array.from(assetTotals.entries())
    .map(([id, performance]) => ({
      id,
      title: assetMap.get(id)?.title ?? `${assetMap.get(id)?.asset_type ?? "Generated"} asset`,
      assetType: assetMap.get(id)?.asset_type ?? "asset",
      performance,
    }))
    .sort((a, b) => b.performance.conversions - a.performance.conversions || b.performance.sessions - a.performance.sessions)
    .slice(0, 10);

  const channelMap = new Map<string, AnalyticsMetricTotals>();
  metrics.forEach((row) => {
    const channel = row.channel?.trim() || "Unattributed";
    channelMap.set(channel, addAnalyticsMetricRow(channelMap.get(channel) ?? EMPTY_ANALYTICS_TOTALS, row));
  });
  const channelRows = Array.from(channelMap.entries())
    .map(([channel, performance]) => ({ channel, performance }))
    .sort((a, b) => b.performance.sessions - a.performance.sessions)
    .slice(0, 8);

  const dailySessions = new Map<string, number>();
  metrics.forEach((row) => {
    dailySessions.set(
      row.metric_date,
      (dailySessions.get(row.metric_date) ?? 0) + safeAnalyticsNumber(row.sessions_count),
    );
  });
  const trendLength = Math.min(14, range.days);
  const trendDays = Array.from({ length: trendLength }, (_, index) => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - (trendLength - 1 - index));
    const key = dateKey(day);
    return {
      key,
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(day),
      sessions: dailySessions.get(key) ?? 0,
    };
  });
  const maxDailySessions = Math.max(...trendDays.map((day) => day.sessions), 1);

  const nativeSource = sources.find((source) => source.source_type === "native") ?? null;
  const ga4Source = sources.find((source) => source.source_type === "ga4") ?? null;
  const ga4Settings = ga4Source?.settings ?? {};
  const availableProperties = Array.isArray(ga4Settings.available_properties)
    ? (ga4Settings.available_properties as AnalyticsPropertyOption[])
    : [];
  const selectedProperty =
    ga4Settings.selected_property && typeof ga4Settings.selected_property === "object"
      ? (ga4Settings.selected_property as AnalyticsPropertyOption)
      : null;
  const trackerBaseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  const goalViews: AnalyticsGoalView[] = goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    description: goal.description,
    eventName: goal.event_name,
    goalType: goal.goal_type,
    isPrimary: goal.is_primary,
    isActive: goal.is_active,
    defaultValue: goal.default_value === null ? null : safeAnalyticsNumber(goal.default_value),
    currencyCode: goal.currency_code,
  }));
  const sourceNameMap = new Map(sources.map((source) => [source.id, source.name]));
  const syncRunViews: AnalyticsSyncRunView[] = syncRuns.map((run) => ({
    id: run.id,
    sourceName: run.source_id ? sourceNameMap.get(run.source_id) ?? run.source_type : run.source_type,
    sourceType: run.source_type,
    triggerType: run.trigger_type,
    status: run.status,
    startDate: run.start_date,
    endDate: run.end_date,
    rowsProcessed: safeAnalyticsNumber(run.rows_processed),
    errorMessage: run.error_message,
    startedAt: run.started_at,
    completedAt: run.completed_at,
  }));

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Analytics · {accountContext.activeAccountName ?? "Active workspace"}</p>
          <h1 className={styles.heroTitle}>Connect marketing activity to business results.</h1>
          <p className={styles.heroCopy}>
            Review traffic, conversions, revenue, campaign performance, and data health from one account-scoped reporting system.
          </p>
        </div>
        <div className={styles.heroStatus}>
          <span className={schemaReady ? styles.statusReady : styles.statusWarning}>
            {schemaReady ? "Reporting operational" : "Analytics setup required"}
          </span>
          <p>{range.startDate} through {range.endDate}</p>
        </div>
      </section>

      {!schemaReady ? (
        <section className={styles.notice}>
          <div>
            <p className={styles.noticeLabel}>Setup required</p>
            <h2>Complete the analytics database setup.</h2>
            <p>The dashboard needs its reporting and sync-history fields before analytics can run.</p>
          </div>
        </section>
      ) : null}

      <form className={styles.filterBar} method="get">
        <div>
          <label htmlFor="analytics-days">Reporting window</label>
          <select id="analytics-days" name="days" defaultValue={String(range.days)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <div>
          <label htmlFor="analytics-source">Data source</label>
          <select id="analytics-source" name="source" defaultValue={sourceFilter}>
            <option value="all">All sources</option>
            <option value="native">Marketing VIP Native</option>
            <option value="ga4">Google Analytics 4</option>
          </select>
        </div>
        <button type="submit" className={styles.secondaryButton}>Apply Filters</button>
      </form>

      {schemaReady ? (
        <AnalyticsSetupPanel
          key={activeAccountId}
          activeAccountId={activeAccountId}
          activeAccountName={accountContext.activeAccountName ?? "Active workspace"}
          nativeSource={nativeSource ? {
            status: nativeSource.status,
            name: nativeSource.name,
            websiteUrl: nativeSource.website_url,
            collectionKey: nativeSource.collection_key,
            keyRotatedAt: nativeSource.key_rotated_at,
          } : null}
          ga4Source={ga4Source ? {
            status: ga4Source.status,
            name: ga4Source.name,
            propertyId: ga4Source.external_property_id,
            lastSyncedAt: ga4Source.last_synced_at,
            lastError: ga4Source.last_error,
            availableProperties,
            selectedProperty,
          } : null}
          canManage={accountContext.canManageActiveAccount}
          googleConfigured={googleAnalyticsOAuthIsConfigured()}
          trackerBaseUrl={trackerBaseUrl}
        />
      ) : null}

      <section className={styles.metricGrid} aria-label="Analytics summary">
        <article className={styles.metricCard}><p>Sessions</p><strong>{formatAnalyticsInteger(totals.sessions)}</strong><span>{formatAnalyticsInteger(totals.users)} users</span></article>
        <article className={styles.metricCard}><p>Page views</p><strong>{formatAnalyticsInteger(totals.pageViews)}</strong><span>{analyticsEngagementRate(totals).toFixed(1)}% engagement rate</span></article>
        <article className={styles.metricCard}><p>Leads</p><strong>{formatAnalyticsInteger(totals.leads)}</strong><span>{goalViews.filter((goal) => goal.isActive).length} active goals</span></article>
        <article className={styles.metricCard}><p>Conversions</p><strong>{formatAnalyticsInteger(totals.conversions)}</strong><span>{analyticsConversionRate(totals).toFixed(1)}% session conversion rate</span></article>
        <article className={styles.metricCard}><p>Attributed revenue</p><strong>{formatAnalyticsCurrency(totals.revenue)}</strong><span>Native campaign and asset attribution</span></article>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Traffic trend</p><h2>Recent sessions</h2></div><span className={styles.panelPill}>{range.label}</span></div>
          {totals.sessions ? (
            <div className={styles.chart}>
              {trendDays.map((day) => (
                <div key={day.key} className={styles.chartColumn} title={`${day.label}: ${day.sessions} sessions`}>
                  <div className={styles.chartTrack}><span className={styles.chartBar} style={{ height: `${Math.max((day.sessions / maxDailySessions) * 100, day.sessions ? 5 : 0)}%` }} /></div>
                  <span>{day.label}</span>
                </div>
              ))}
            </div>
          ) : <div className={styles.emptyState}><strong>No reporting data in this view.</strong><p>Change the source or date filter, or run a synchronization.</p></div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Acquisition</p><h2>Channel performance</h2></div></div>
          {channelRows.length ? (
            <div className={styles.channelTable}>
              <div className={styles.channelHeader}><span>Channel</span><span>Sessions</span><span>Leads</span><span>Conversions</span></div>
              {channelRows.map((row) => (
                <div key={row.channel} className={styles.channelRow}><strong>{row.channel}</strong><span>{formatAnalyticsInteger(row.performance.sessions)}</span><span>{formatAnalyticsInteger(row.performance.leads)}</span><span>{formatAnalyticsInteger(row.performance.conversions)}</span></div>
              ))}
            </div>
          ) : <div className={styles.emptyState}><strong>No channel data yet.</strong><p>Channel reporting will populate from native events and GA4.</p></div>}
        </section>
      </div>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Campaign attribution</p><h2>Campaign performance</h2><p className={styles.panelCopy}>Attributed native activity is connected to the campaign UUID captured by the tracker.</p></div></div>
          {campaignPerformance.length ? (
            <div className={styles.performanceTable}>
              <div className={styles.performanceHeader}><span>Campaign</span><span>Sessions</span><span>Conversions</span><span>Revenue</span></div>
              {campaignPerformance.map((row) => (
                <Link key={row.id} href={`/analytics/campaigns/${row.id}?${queryString}`} className={styles.performanceRow}>
                  <strong>{row.name}</strong><span>{formatAnalyticsInteger(row.performance.sessions)}</span><span>{formatAnalyticsInteger(row.performance.conversions)}</span><span>{formatAnalyticsCurrency(row.performance.revenue)}</span>
                </Link>
              ))}
            </div>
          ) : <div className={styles.emptyState}><strong>No attributed campaigns yet.</strong><p>Results will appear after tracked campaign links begin recording activity. <Link href="/campaigns">Review campaigns →</Link></p></div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Asset attribution</p><h2>Asset performance</h2><p className={styles.panelCopy}>Compare generated assets using captured visits, leads, conversions, and revenue.</p></div></div>
          {assetPerformance.length ? (
            <div className={styles.performanceTable}>
              <div className={styles.performanceHeader}><span>Asset</span><span>Sessions</span><span>Conversions</span><span>Revenue</span></div>
              {assetPerformance.map((row) => (
                <Link key={row.id} href={`/analytics/assets/${row.id}?${queryString}`} className={styles.performanceRow}>
                  <strong>{row.title}<small>{row.assetType}</small></strong><span>{formatAnalyticsInteger(row.performance.sessions)}</span><span>{formatAnalyticsInteger(row.performance.conversions)}</span><span>{formatAnalyticsCurrency(row.performance.revenue)}</span>
                </Link>
              ))}
            </div>
          ) : <div className={styles.emptyState}><strong>No attributed assets yet.</strong><p>Asset-level results will appear when tracked links include a valid <code>vip_asset</code> identifier.</p></div>}
        </section>
      </div>

      {schemaReady ? (
        <AnalyticsGoalsPanel
          key={`goals-${activeAccountId}`}
          goals={goalViews}
          eventOptions={ANALYTICS_EVENT_DEFINITIONS.map((event) => ({ name: event.name, label: event.label, category: event.category, description: event.description }))}
          canManage={accountContext.canManageActiveAccount}
        />
      ) : null}

      {schemaReady ? (
        <AnalyticsOperationsPanel
          key={`operations-${activeAccountId}`}
          runs={syncRunViews}
          canManage={accountContext.canManageActiveAccount}
          cronConfigured={Boolean(process.env.CRON_SECRET?.trim())}
        />
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><p className={styles.panelEyebrow}>Data sources</p><h2>Hybrid analytics architecture</h2></div></div>
        <div className={styles.sourceGrid}>
          {sources.map((source) => (
            <article key={source.id} className={styles.sourceCard}>
              <div className={styles.sourceTop}><span className={styles.sourceIcon}>{source.source_type === "ga4" ? "G4" : "VIP"}</span><span className={source.status === "active" ? styles.sourceActive : styles.sourcePending}>{statusLabel(source.status)}</span></div>
              <h3>{source.name}</h3>
              <dl>
                <div><dt>Last sync</dt><dd>{formatAnalyticsDateTime(source.last_synced_at)}</dd></div>
                <div><dt>Next sync</dt><dd>{source.auto_sync_enabled ? formatAnalyticsDateTime(source.next_sync_at) : "Manual only"}</dd></div>
              </dl>
              {source.last_error ? <p className={styles.sourceError}>{source.last_error}</p> : null}
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
