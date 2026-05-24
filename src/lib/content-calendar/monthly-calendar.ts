export type CalendarSourceType = "calendar_item" | "generated_asset";

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
  campaignName?: string | null;
};

export type MonthOption = {
  value: string;
  label: string;
};

export type CalendarDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  entries: MonthlyCalendarEntry[];
};

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

  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return fallback;
  }

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

export function monthRange(value: string) {
  const { year, month } = parseMonthValue(value);
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0);

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function buildMonthOptionsFromRows(rows: Array<Record<string, any>>) {
  const values = new Set<string>();

  for (const row of rows) {
    const candidate =
      row.scheduled_publish_at ??
      row.target_publish_at ??
      row.publish_at ??
      row.planned_date ??
      row.created_at;

    if (!candidate) continue;

    const date = new Date(candidate);

    if (Number.isNaN(date.getTime())) continue;

    values.add(monthValueFromDate(date));
  }

  if (!values.size) {
    values.add(monthValueFromDate(new Date()));
  }

  return Array.from(values)
    .sort()
    .reverse()
    .map((value) => ({
      value,
      label: monthLabel(value),
    }));
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
      entries: dayEntries.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel)),
    });
  }

  return days;
}

export function entryTypeLabel(value: string | null | undefined) {
  return String(value ?? "content").replaceAll("_", " ");
}

export function statusLabel(value: string | null | undefined) {
  return String(value ?? "planned").replaceAll("_", " ");
}

export function calendarEntryFromAsset(asset: Record<string, any>): MonthlyCalendarEntry | null {
  const date =
    dateKeyFromValue(asset.scheduled_publish_at) ??
    dateKeyFromValue(asset.created_at);

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
    campaignName: asset.campaign_name ?? null,
  };
}

export function calendarEntryFromItem(item: Record<string, any>): MonthlyCalendarEntry | null {
  const date =
    dateKeyFromValue(item.scheduled_publish_at) ??
    dateKeyFromValue(item.target_publish_at) ??
    dateKeyFromValue(item.publish_at) ??
    dateKeyFromValue(item.planned_date) ??
    dateKeyFromValue(item.created_at);

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
    campaignName: item.campaign_name ?? null,
  };
}
