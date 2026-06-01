export type CalendarViewMode = "day" | "week" | "month";

export type CalendarViewRange = {
  view: CalendarViewMode;
  dateValue: string;
  monthValue: string;
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
  label: string;
};

export function isCalendarViewMode(value: unknown): value is CalendarViewMode {
  return value === "day" || value === "week" || value === "month";
}

export function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function monthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function parseDate(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-").map(Number);
    return new Date(year, month - 1, 1, 12, 0, 0, 0);
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeekMonday(date: Date) {
  const start = startOfDay(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  return start;
}

function endOfWeekSunday(date: Date) {
  const end = startOfWeekMonday(date);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function buildCalendarViewRange({
  view,
  date,
  defaultView = "week",
}: {
  view?: unknown;
  date?: unknown;
  defaultView?: CalendarViewMode;
}): CalendarViewRange {
  const activeView: CalendarViewMode = isCalendarViewMode(view) ? view : defaultView;
  const selectedDate = parseDate(date);

  let start: Date;
  let end: Date;

  if (activeView === "day") {
    start = startOfDay(selectedDate);
    end = endOfDay(selectedDate);
  } else if (activeView === "month") {
    start = startOfMonth(selectedDate);
    end = endOfMonth(selectedDate);
  } else {
    start = startOfWeekMonday(selectedDate);
    end = endOfWeekSunday(selectedDate);
  }

  return {
    view: activeView,
    dateValue: dateKey(selectedDate),
    monthValue: monthKey(selectedDate),
    start,
    end,
    startKey: dateKey(start),
    endKey: dateKey(end),
    label: rangeLabel({ view: activeView, start, end }),
  };
}

export function buildCalendarViewRangeFromSearchParams({
  searchParams,
  defaultView = "week",
}: {
  searchParams: Record<string, string | string[] | undefined>;
  defaultView?: CalendarViewMode;
}) {
  const view = firstSearchValue(searchParams.view);
  const date =
    firstSearchValue(searchParams.date) ??
    firstSearchValue(searchParams.month) ??
    firstSearchValue(searchParams.day);

  return buildCalendarViewRange({
    view,
    date,
    defaultView,
  });
}

export function assetDateValue(asset: Record<string, any>) {
  return (
    asset.scheduled_publish_at ??
    asset.planned_publish_date ??
    asset.campaign_week_start_date ??
    asset.created_at ??
    null
  );
}

export function assetDate(asset: Record<string, any>) {
  const value = assetDateValue(asset);

  if (!value) return null;

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function assetIsInRange(asset: Record<string, any>, range: CalendarViewRange) {
  const date = assetDate(asset);

  if (!date) return false;

  return date >= range.start && date <= range.end;
}

export function filterAssetsByViewRange<T extends Record<string, any>>(assets: T[], range: CalendarViewRange) {
  return assets.filter((asset) => assetIsInRange(asset, range));
}

export function groupAssetsByDay<T extends Record<string, any>>(assets: T[]) {
  const groups = new Map<string, T[]>();

  for (const asset of assets) {
    const date = assetDate(asset);
    const key = date ? dateKey(date) : "unscheduled";

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)?.push(asset);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: key === "unscheduled" ? "Unscheduled" : dayLabel(key),
      assets: items,
    }));
}

export function dayLabel(value: string) {
  const date = parseDate(value);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function rangeLabel({
  view,
  start,
  end,
}: {
  view: CalendarViewMode;
  start: Date;
  end: Date;
}) {
  if (view === "day") {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(start);
  }

  if (view === "month") {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(start);
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function dateTimeLabel(value: string | null | undefined) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
