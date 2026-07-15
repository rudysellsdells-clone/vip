export type Ga4DailyMetricRecord = {
  account_id: string;
  source_id: string;
  metric_date: string;
  dimension_key: string;
  campaign_id: string | null;
  asset_id: string | null;
  channel: string;
  traffic_source: string;
  traffic_medium: string;
  users_count: number;
  sessions_count: number;
  engaged_sessions_count: number;
  page_views_count: number;
  leads_count: number;
  conversions_count: number;
  revenue: number;
  updated_at: string;
};

const COUNT_FIELDS = [
  "users_count",
  "sessions_count",
  "engaged_sessions_count",
  "page_views_count",
  "leads_count",
  "conversions_count",
] as const;

function aggregationKey(record: Ga4DailyMetricRecord) {
  return [
    record.account_id,
    record.source_id,
    record.metric_date,
    record.dimension_key,
  ].join("|");
}

/**
 * GA4 can return distinct raw rows that resolve to the same normalized VIP
 * campaign/content key. The reporting table intentionally allows one row per
 * account, source, date, and normalized dimension key, so merge those rows
 * before writing them to Postgres.
 */
export function aggregateGa4DailyMetricRecords(
  records: Ga4DailyMetricRecord[],
): Ga4DailyMetricRecord[] {
  const aggregated = new Map<string, Ga4DailyMetricRecord>();

  for (const record of records) {
    const key = aggregationKey(record);
    const current = aggregated.get(key);

    if (!current) {
      aggregated.set(key, { ...record });
      continue;
    }

    for (const field of COUNT_FIELDS) {
      current[field] += record[field];
    }

    current.revenue += record.revenue;
    current.updated_at = record.updated_at;
  }

  return Array.from(aggregated.values());
}
