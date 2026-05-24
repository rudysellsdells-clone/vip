export type CalendarSourceType = "campaign" | "calendar_item" | "generated_asset";

export type MonthlyCalendarEntry = {
  id: string;
  source: CalendarSourceType;
  title: string;
  itemType: string;
  status: string;
  date: string;
  timeLabel: string;
  href: string;
  description?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  weekNumber?: number | null;
  sortOrder?: number | null;
};

export type CalendarDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  entries: MonthlyCalendarEntry[];
};

const SORT_ORDER_DAY_OFFSET = new Map<number, number>([
  [10, 0],
  [20, 0],
  [30, 1],
  [40, 1],
  [50, 1],
  [60, 2],
  [70, 2],
  [80, 3],
  [90, 3],
  [100, 3],
  [110, 4],
  [120, 4],
  [130, 4],
]);

export function monthValueFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function parseMonthValue(value?: string | null) {
  const now = new Date();
  const fallback = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    value: monthValueFromDate(now),
  };

  if (!value || !/^\d{4}-\d{2}$/.test(value)) return fallback;

  const [yearString, monthString] = value.split("-");
  const year = Number(yearString);
  const month = Number(monthString);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return fallback;
  }

  return {
    year,
    month,
    value,
  };
}

export function monthLabel(value: string) {
  const { year, month } = parseMonthValue(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function dateKeyFromValue(value: string | null | undefined) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return dateKey(date);
}

export function timeLabelFromValue(value: string | null | undefined) {
  if (!value) return "Any time";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Any time";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function monthFromDateLike(value: unknown) {
  if (!value) return null;

  const text = String(value);

  if (/^\d{4}-\d{2}/.test(text)) {
    return text.slice(0, 7);
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  return monthValueFromDate(date);
}

function monthCandidate(row: Record<string, any>) {
  const metadata = row.metadata ?? {};

  return (
    row.campaign_month ??
    row.intended_publish_month ??
    monthFromDateLike(row.planned_publish_date) ??
    monthFromDateLike(row.scheduled_publish_at) ??
    monthFromDateLike(row.target_publish_at) ??
    monthFromDateLike(row.publish_at) ??
    monthFromDateLike(row.planned_date) ??
    metadata.campaignMonth ??
    metadata.intendedPublishMonth ??
    metadata.month ??
    null
  );
}

function rollingMonthValues() {
  const now = new Date();
  const values: string[] = [];

  for (let offset = -6; offset <= 12; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    values.push(monthValueFromDate(date));
  }

  return values;
}

export function buildMonthOptionsFromRows(rows: Array<Record<string, any>>) {
  const values = new Set<string>();

  for (const row of rows) {
    const direct = monthCandidate(row);

    if (direct && /^\d{4}-\d{2}$/.test(direct)) {
      values.add(direct);
    }
  }

  for (const value of rollingMonthValues()) {
    values.add(value);
  }

  return Array.from(values)
    .sort()
    .map((value) => ({
      value,
      label: monthLabel(value),
    }));
}

export function contentMonthOptionsFromRows(rows: Array<Record<string, any>>) {
  const values = new Set<string>();

  for (const row of rows) {
    const direct = monthCandidate(row);

    if (direct && /^\d{4}-\d{2}$/.test(direct)) {
      values.add(direct);
    }
  }

  return Array.from(values).sort();
}

export function entryTypeLabel(value: string | null | undefined) {
  return String(value ?? "content").replaceAll("_", " ");
}

export function statusLabel(value: string | null | undefined) {
  return String(value ?? "planned").replaceAll("_", " ");
}

function addDays(dateKeyValue: string, days: number) {
  const date = new Date(`${dateKeyValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function campaignStartDate(campaign: Record<string, any> | undefined | null) {
  return (
    dateKeyFromValue(campaign?.campaign_week_start_date) ??
    dateKeyFromValue(campaign?.planned_start_date)
  );
}

function inferAssetDateFromCampaign(asset: Record<string, any>, campaign: Record<string, any> | undefined | null) {
  const start = campaignStartDate(campaign) ?? dateKeyFromValue(asset.campaign_week_start_date);

  if (!start) return null;

  const sortOrder = Number(asset.calendar_sort_order ?? 0);
  const offset = SORT_ORDER_DAY_OFFSET.get(sortOrder);

  if (offset !== undefined) {
    return addDays(start, offset);
  }

  return start;
}

function campaignMonthDateFallback(month: string | null | undefined) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;

  return `${month}-01`;
}

export function calendarEntryFromCampaign(campaign: Record<string, any>): MonthlyCalendarEntry | null {
  const date =
    dateKeyFromValue(campaign.campaign_week_start_date ?? campaign.planned_start_date) ??
    campaignMonthDateFallback(campaign.campaign_month);

  if (!date) return null;

  return {
    id: campaign.id,
    source: "campaign",
    title: campaign.title ?? campaign.name ?? "Untitled campaign",
    itemType: "campaign",
    status: campaign.status ?? "active",
    date,
    timeLabel: "Week",
    href: `/campaigns`,
    description: campaign.description ?? campaign.metadata?.calendarNotes ?? null,
    campaignId: campaign.id,
    campaignName: campaign.title ?? campaign.name ?? null,
    weekNumber: campaign.campaign_week_number ?? null,
    sortOrder: 0,
  };
}

export function calendarEntryFromAsset({
  asset,
  campaignById,
}: {
  asset: Record<string, any>;
  campaignById: Map<string, Record<string, any>>;
}): MonthlyCalendarEntry | null {
  const campaign = asset.campaign_id ? campaignById.get(String(asset.campaign_id)) : null;
  const campaignName = campaign?.title ?? campaign?.name ?? null;

  /*
    Important: do NOT fall back to created_at here.
    Campaign/calendar content should be placed by planned/scheduled/campaign date only.
    Falling back to created_at causes an entire generated batch to pile onto today's date.
  */
  const date =
    dateKeyFromValue(asset.planned_publish_date) ??
    dateKeyFromValue(asset.scheduled_publish_at) ??
    inferAssetDateFromCampaign(asset, campaign) ??
    campaignMonthDateFallback(asset.intended_publish_month ?? campaign?.campaign_month);

  if (!date) return null;

  return {
    id: asset.id,
    source: "generated_asset",
    title: asset.title ?? "Untitled asset",
    itemType: asset.asset_type ?? "asset",
    status: asset.status ?? "created",
    date,
    timeLabel: timeLabelFromValue(asset.scheduled_publish_at),
    href: `/assets/${asset.id}`,
    description: asset.content ? String(asset.content).slice(0, 120) : null,
    campaignId: asset.campaign_id ?? null,
    campaignName,
    weekNumber: asset.campaign_week_number ?? campaign?.campaign_week_number ?? null,
    sortOrder: asset.calendar_sort_order ?? 50,
  };
}

export function calendarEntryFromItem({
  item,
  campaignById,
}: {
  item: Record<string, any>;
  campaignById: Map<string, Record<string, any>>;
}): MonthlyCalendarEntry | null {
  const campaign = item.campaign_id ? campaignById.get(String(item.campaign_id)) : null;
  const campaignName = campaign?.title ?? campaign?.name ?? null;

  const date =
    dateKeyFromValue(item.planned_publish_date) ??
    dateKeyFromValue(item.scheduled_publish_at) ??
    dateKeyFromValue(item.target_publish_at) ??
    dateKeyFromValue(item.publish_at) ??
    dateKeyFromValue(item.planned_date) ??
    inferAssetDateFromCampaign(item, campaign) ??
    campaignMonthDateFallback(item.intended_publish_month ?? campaign?.campaign_month);

  if (!date) return null;

  return {
    id: item.id,
    source: "calendar_item",
    title: item.title ?? "Untitled calendar item",
    itemType: item.item_type ?? item.asset_type ?? "calendar_item",
    status: item.status ?? "planned",
    date,
    timeLabel: timeLabelFromValue(
      item.scheduled_publish_at ?? item.target_publish_at ?? item.publish_at
    ),
    href: `/content-calendar`,
    description: item.description ?? item.notes ?? item.prompt ?? null,
    campaignId: item.campaign_id ?? null,
    campaignName,
    weekNumber: item.campaign_week_number ?? campaign?.campaign_week_number ?? null,
    sortOrder: item.calendar_sort_order ?? 40,
  };
}

export function belongsToSelectedMonth(entry: MonthlyCalendarEntry, selectedMonth: string) {
  return entry.date.slice(0, 7) === selectedMonth;
}

export function buildCalendarGrid({
  monthValue,
  entries,
}: {
  monthValue: string;
  entries: MonthlyCalendarEntry[];
}) {
  const { year, month } = parseMonthValue(monthValue);
  const firstOfMonth = new Date(year, month - 1, 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());

  const entriesByDate = new Map<string, MonthlyCalendarEntry[]>();

  for (const entry of entries) {
    const current = entriesByDate.get(entry.date) ?? [];
    current.push(entry);
    entriesByDate.set(entry.date, current);
  }

  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    const key = dateKey(date);
    const dayEntries = entriesByDate.get(key) ?? [];

    days.push({
      date,
      dateKey: key,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month - 1,
      entries: dayEntries.sort((a, b) => {
        const sortA = a.sortOrder ?? 50;
        const sortB = b.sortOrder ?? 50;

        if (sortA !== sortB) return sortA - sortB;

        return a.timeLabel.localeCompare(b.timeLabel);
      }),
    });
  }

  return days;
}
