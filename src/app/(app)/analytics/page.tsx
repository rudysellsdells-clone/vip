import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { ANALYTICS_EVENT_DEFINITIONS } from "@/lib/analytics/event-taxonomy";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import styles from "./Analytics.module.css";

export const dynamic = "force-dynamic";

type DataSourceRow = {
  id: string;
  source_type: "native" | "ga4";
  status: "draft" | "connecting" | "active" | "paused" | "error";
  name: string;
  website_url: string | null;
  external_property_id: string | null;
  last_synced_at: string | null;
  last_error: string | null;
};

type DailyMetricRow = {
  metric_date: string;
  channel: string | null;
  users_count: number | string | null;
  sessions_count: number | string | null;
  engaged_sessions_count: number | string | null;
  page_views_count: number | string | null;
  leads_count: number | string | null;
  conversions_count: number | string | null;
  revenue: number | string | null;
};

type MetricTotals = {
  users: number;
  sessions: number;
  engagedSessions: number;
  pageViews: number;
  leads: number;
  conversions: number;
  revenue: number;
};

const EMPTY_TOTALS: MetricTotals = {
  users: 0,
  sessions: 0,
  engagedSessions: 0,
  pageViews: 0,
  leads: 0,
  conversions: 0,
  revenue: 0,
};

function safeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "Not synced yet";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateWindow(days: number) {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return {
    end,
    startKey: dateKey(start),
    endKey: dateKey(end),
  };
}

function addMetricRow(totals: MetricTotals, row: DailyMetricRow): MetricTotals {
  return {
    users: totals.users + safeNumber(row.users_count),
    sessions: totals.sessions + safeNumber(row.sessions_count),
    engagedSessions: totals.engagedSessions + safeNumber(row.engaged_sessions_count),
    pageViews: totals.pageViews + safeNumber(row.page_views_count),
    leads: totals.leads + safeNumber(row.leads_count),
    conversions: totals.conversions + safeNumber(row.conversions_count),
    revenue: totals.revenue + safeNumber(row.revenue),
  };
}

function statusLabel(status: DataSourceRow["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function engagementRate(totals: MetricTotals) {
  if (!totals.sessions) return 0;
  return (totals.engagedSessions / totals.sessions) * 100;
}

function conversionRate(totals: MetricTotals) {
  if (!totals.sessions) return 0;
  return (totals.conversions / totals.sessions) * 100;
}

export default async function AnalyticsPage() {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;

  if (!activeAccountId) {
    redirect("/accounts");
  }

  const window = buildDateWindow(30);
  const [sourcesResult, metricsResult, goalsResult] = await Promise.all([
    supabase
      .from("analytics_data_sources")
      .select("id,source_type,status,name,website_url,external_property_id,last_synced_at,last_error")
      .eq("account_id", activeAccountId)
      .order("created_at", { ascending: true }),
    supabase
      .from("analytics_daily_metrics")
      .select(
        "metric_date,channel,users_count,sessions_count,engaged_sessions_count,page_views_count,leads_count,conversions_count,revenue",
      )
      .eq("account_id", activeAccountId)
      .gte("metric_date", window.startKey)
      .lte("metric_date", window.endKey)
      .order("metric_date", { ascending: true }),
    supabase
      .from("analytics_goals")
      .select("id")
      .eq("account_id", activeAccountId)
      .eq("is_active", true),
  ]);

  const schemaReady = !sourcesResult.error && !metricsResult.error && !goalsResult.error;
  const sources = (sourcesResult.data ?? []) as DataSourceRow[];
  const metrics = (metricsResult.data ?? []) as DailyMetricRow[];
  const activeGoalCount = goalsResult.data?.length ?? 0;
  const totals = metrics.reduce(addMetricRow, EMPTY_TOTALS);

  const channelMap = new Map<string, MetricTotals>();
  metrics.forEach((row) => {
    const channel = row.channel?.trim() || "Unattributed";
    const current = channelMap.get(channel) ?? EMPTY_TOTALS;
    channelMap.set(channel, addMetricRow(current, row));
  });

  const channelRows = Array.from(channelMap.entries())
    .map(([channel, channelTotals]) => ({ channel, totals: channelTotals }))
    .sort((a, b) => b.totals.sessions - a.totals.sessions)
    .slice(0, 6);

  const dailySessions = new Map<string, number>();
  metrics.forEach((row) => {
    dailySessions.set(
      row.metric_date,
      (dailySessions.get(row.metric_date) ?? 0) + safeNumber(row.sessions_count),
    );
  });

  const trendDays = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(window.end);
    day.setUTCDate(day.getUTCDate() - (13 - index));
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

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            Analytics · {accountContext.activeAccountName ?? "Active workspace"}
          </p>
          <h1 className={styles.heroTitle}>See what is working—and what to do next.</h1>
          <p className={styles.heroCopy}>
            Marketing VIP analytics will connect strategy, content, traffic, leads, conversions,
            and revenue without making Google Analytics the permanent source of truth.
          </p>
        </div>
        <div className={styles.heroStatus}>
          <span className={schemaReady ? styles.statusReady : styles.statusWarning}>
            {schemaReady ? "Analytics foundation ready" : "Database migration required"}
          </span>
          <p>
            Reporting window: {window.startKey} through {window.endKey}
          </p>
        </div>
      </section>

      {!schemaReady ? (
        <section className={styles.notice}>
          <div>
            <p className={styles.noticeLabel}>Setup required</p>
            <h2>Apply the H1.7A analytics database migration.</h2>
            <p>
              The page is installed, but the account-scoped analytics tables are not available yet.
              Apply the included SQL migration in Supabase, then reload this page.
            </p>
          </div>
        </section>
      ) : null}

      <section className={styles.metricGrid} aria-label="Analytics summary">
        <article className={styles.metricCard}>
          <p>Sessions</p>
          <strong>{formatInteger(totals.sessions)}</strong>
          <span>{formatInteger(totals.users)} users</span>
        </article>
        <article className={styles.metricCard}>
          <p>Page views</p>
          <strong>{formatInteger(totals.pageViews)}</strong>
          <span>{engagementRate(totals).toFixed(1)}% engagement rate</span>
        </article>
        <article className={styles.metricCard}>
          <p>Leads</p>
          <strong>{formatInteger(totals.leads)}</strong>
          <span>{activeGoalCount} active goals</span>
        </article>
        <article className={styles.metricCard}>
          <p>Conversions</p>
          <strong>{formatInteger(totals.conversions)}</strong>
          <span>{conversionRate(totals).toFixed(1)}% session conversion rate</span>
        </article>
        <article className={styles.metricCard}>
          <p>Attributed revenue</p>
          <strong>{formatCurrency(totals.revenue)}</strong>
          <span>Campaign and asset attribution</span>
        </article>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Traffic trend</p>
              <h2>Sessions over the last 14 days</h2>
            </div>
            <span className={styles.panelPill}>Cached reporting</span>
          </div>

          {totals.sessions > 0 ? (
            <div className={styles.chart}>
              {trendDays.map((day) => (
                <div key={day.key} className={styles.chartColumn} title={`${day.label}: ${day.sessions} sessions`}>
                  <div className={styles.chartTrack}>
                    <span
                      className={styles.chartBar}
                      style={{ height: `${Math.max((day.sessions / maxDailySessions) * 100, day.sessions ? 5 : 0)}%` }}
                    />
                  </div>
                  <span>{day.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No reporting data yet.</strong>
              <p>Traffic will appear after the native collector or GA4 synchronization is enabled.</p>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Acquisition</p>
              <h2>Channel performance</h2>
            </div>
          </div>

          {channelRows.length ? (
            <div className={styles.channelTable}>
              <div className={styles.channelHeader}>
                <span>Channel</span>
                <span>Sessions</span>
                <span>Leads</span>
                <span>Conversions</span>
              </div>
              {channelRows.map((row) => (
                <div key={row.channel} className={styles.channelRow}>
                  <strong>{row.channel}</strong>
                  <span>{formatInteger(row.totals.sessions)}</span>
                  <span>{formatInteger(row.totals.leads)}</span>
                  <span>{formatInteger(row.totals.conversions)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>No channel data yet.</strong>
              <p>Source, medium, and channel summaries will populate through the shared reporting model.</p>
            </div>
          )}
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Data sources</p>
            <h2>Hybrid analytics architecture</h2>
            <p className={styles.panelCopy}>
              Native Marketing VIP events provide product ownership. GA4 adds historical and familiar website reporting.
            </p>
          </div>
        </div>

        <div className={styles.sourceGrid}>
          <article className={styles.sourceCard}>
            <div className={styles.sourceTop}>
              <span className={styles.sourceIcon}>VIP</span>
              <span className={nativeSource?.status === "active" ? styles.sourceActive : styles.sourcePending}>
                {nativeSource ? statusLabel(nativeSource.status) : "Foundation installed"}
              </span>
            </div>
            <h3>Marketing VIP Native</h3>
            <p>
              Own campaign visits, asset interactions, leads, conversions, and attributed revenue as first-party events.
            </p>
            <dl>
              <div>
                <dt>Source</dt>
                <dd>{nativeSource?.name ?? "Native collector—not configured"}</dd>
              </div>
              <div>
                <dt>Last activity</dt>
                <dd>{formatDateTime(nativeSource?.last_synced_at ?? null)}</dd>
              </div>
            </dl>
          </article>

          <article className={styles.sourceCard}>
            <div className={styles.sourceTop}>
              <span className={styles.sourceIcon}>G4</span>
              <span className={ga4Source?.status === "active" ? styles.sourceActive : styles.sourcePending}>
                {ga4Source ? statusLabel(ga4Source.status) : "Phase H1.7B"}
              </span>
            </div>
            <h3>Google Analytics 4</h3>
            <p>
              Import users, sessions, engagement, landing pages, campaign dimensions, and key events into cached reporting tables.
            </p>
            <dl>
              <div>
                <dt>Property</dt>
                <dd>{ga4Source?.external_property_id ?? "Not connected"}</dd>
              </div>
              <div>
                <dt>Last sync</dt>
                <dd>{formatDateTime(ga4Source?.last_synced_at ?? null)}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Canonical event model</p>
            <h2>Events Marketing VIP will understand</h2>
            <p className={styles.panelCopy}>
              These names are now the shared vocabulary for the native collector, GA4 mapping, goals, attribution, and future AI recommendations.
            </p>
          </div>
        </div>
        <div className={styles.eventGrid}>
          {ANALYTICS_EVENT_DEFINITIONS.map((event) => (
            <article key={event.name} className={styles.eventCard}>
              <span>{event.category}</span>
              <h3>{event.label}</h3>
              <code>{event.name}</code>
              <p>{event.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.nextStep}>
        <div>
          <p className={styles.panelEyebrow}>Next implementation gate</p>
          <h2>H1.7B: native collection endpoint and GA4 authorization</h2>
          <p>
            The next patch will create guarded event ingestion, site identifiers, setup controls, and the Google OAuth connection flow without changing this reporting contract.
          </p>
        </div>
        <Link href="/campaigns" className={styles.secondaryButton}>
          Review campaigns
        </Link>
      </section>
    </main>
  );
}
