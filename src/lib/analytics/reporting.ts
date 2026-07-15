export type AnalyticsSourceFilter = "all" | "native" | "ga4";

export type AnalyticsDateRange = {
  days: 7 | 30 | 90;
  startDate: string;
  endDate: string;
  label: string;
};

export type AnalyticsDailyMetricRow = {
  source_id: string;
  metric_date: string;
  campaign_id: string | null;
  asset_id: string | null;
  channel: string | null;
  traffic_source?: string | null;
  traffic_medium?: string | null;
  users_count: number | string | null;
  sessions_count: number | string | null;
  engaged_sessions_count: number | string | null;
  page_views_count: number | string | null;
  leads_count: number | string | null;
  conversions_count: number | string | null;
  revenue: number | string | null;
};

export type AnalyticsMetricTotals = {
  users: number;
  sessions: number;
  engagedSessions: number;
  pageViews: number;
  leads: number;
  conversions: number;
  revenue: number;
};

export const EMPTY_ANALYTICS_TOTALS: AnalyticsMetricTotals = {
  users: 0,
  sessions: 0,
  engagedSessions: 0,
  pageViews: 0,
  leads: 0,
  conversions: 0,
  revenue: 0,
};

export function safeAnalyticsNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function addAnalyticsMetricRow(
  totals: AnalyticsMetricTotals,
  row: AnalyticsDailyMetricRow,
): AnalyticsMetricTotals {
  return {
    users: totals.users + safeAnalyticsNumber(row.users_count),
    sessions: totals.sessions + safeAnalyticsNumber(row.sessions_count),
    engagedSessions:
      totals.engagedSessions + safeAnalyticsNumber(row.engaged_sessions_count),
    pageViews: totals.pageViews + safeAnalyticsNumber(row.page_views_count),
    leads: totals.leads + safeAnalyticsNumber(row.leads_count),
    conversions: totals.conversions + safeAnalyticsNumber(row.conversions_count),
    revenue: totals.revenue + safeAnalyticsNumber(row.revenue),
  };
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveAnalyticsDateRange(value: unknown): AnalyticsDateRange {
  const numeric = Number(Array.isArray(value) ? value[0] : value);
  const days: 7 | 30 | 90 = numeric === 7 || numeric === 90 ? numeric : 30;
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return {
    days,
    startDate: dateKey(start),
    endDate: dateKey(end),
    label: `Last ${days} days`,
  };
}

export function resolveAnalyticsSourceFilter(value: unknown): AnalyticsSourceFilter {
  const text = String(Array.isArray(value) ? value[0] ?? "" : value ?? "").toLowerCase();
  return text === "native" || text === "ga4" ? text : "all";
}

export function formatAnalyticsInteger(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatAnalyticsCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatAnalyticsDateTime(value: string | null | undefined) {
  if (!value) return "Not yet";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function analyticsEngagementRate(totals: AnalyticsMetricTotals) {
  return totals.sessions ? (totals.engagedSessions / totals.sessions) * 100 : 0;
}

export function analyticsConversionRate(totals: AnalyticsMetricTotals) {
  return totals.sessions ? (totals.conversions / totals.sessions) * 100 : 0;
}

export function analyticsQueryString({
  days,
  source,
}: {
  days: number;
  source: AnalyticsSourceFilter;
}) {
  const params = new URLSearchParams();
  params.set("days", String(days));
  if (source !== "all") params.set("source", source);
  return params.toString();
}
