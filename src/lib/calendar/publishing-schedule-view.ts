import { CalendarViewRange, dateKey, dayLabel } from "@/lib/calendar/view-range";

export function publishingDateValue(asset: Record<string, any>) {
  return asset.scheduled_publish_at ?? asset.planned_publish_date ?? null;
}

export function publishingDate(asset: Record<string, any>) {
  const value = publishingDateValue(asset);

  if (!value) return null;

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function filterPublishingAssetsByViewRange<T extends Record<string, any>>(
  assets: T[],
  range: CalendarViewRange,
  options: {
    includeUnscheduled?: boolean;
  } = {}
) {
  const includeUnscheduled = options.includeUnscheduled ?? true;

  return assets.filter((asset) => {
    const date = publishingDate(asset);

    if (!date) return includeUnscheduled;

    return date >= range.start && date <= range.end;
  });
}

export function groupPublishingAssetsByDay<T extends Record<string, any>>(assets: T[]) {
  const scheduledGroups = new Map<string, T[]>();
  const unscheduled: T[] = [];

  for (const asset of assets) {
    const date = publishingDate(asset);

    if (!date) {
      unscheduled.push(asset);
      continue;
    }

    const key = dateKey(date);

    if (!scheduledGroups.has(key)) {
      scheduledGroups.set(key, []);
    }

    scheduledGroups.get(key)?.push(asset);
  }

  const groups = Array.from(scheduledGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: dayLabel(key),
      assets: items,
      isUnscheduled: false,
    }));

  if (unscheduled.length) {
    groups.unshift({
      key: "unscheduled",
      label: "Unscheduled / Publish Now",
      assets: unscheduled,
      isUnscheduled: true,
    });
  }

  return groups;
}

export function publishingDateLabel(asset: Record<string, any>) {
  const value = publishingDateValue(asset);

  if (!value) return "No date — publish now";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "No date — publish now";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
