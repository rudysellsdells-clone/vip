import {
  DEFAULT_PUBLISH_TIMEZONE,
  SCHEDULABLE_ASSET_TYPES,
  WEEKLY_PUBLISHING_CADENCE,
} from "@/lib/publishing-schedule/defaults";

type Asset = Record<string, any>;

function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
}

function firstMondayOfMonth(year: number, month: number) {
  const date = startOfMonth(year, month);
  const day = date.getUTCDay();
  const offset = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function setTime(date: Date, hour: number, minute: number) {
  const next = new Date(date);
  next.setUTCHours(hour + 6, minute, 0, 0);
  return next;
}

function normalizeMonth(value: unknown) {
  const month = Number(value);
  if (!Number.isFinite(month)) return new Date().getMonth() + 1;
  return Math.max(1, Math.min(12, Math.round(month)));
}

function normalizeYear(value: unknown) {
  const year = Number(value);
  if (!Number.isFinite(year)) return new Date().getFullYear();
  return Math.max(2024, Math.min(2100, Math.round(year)));
}

export function normalizeScheduleRequest(body: Record<string, any>) {
  return {
    year: normalizeYear(body.year),
    month: normalizeMonth(body.month),
    timezone: String(body.timezone || DEFAULT_PUBLISH_TIMEZONE).trim() || DEFAULT_PUBLISH_TIMEZONE,
    overwriteExisting: Boolean(body.overwriteExisting),
  };
}

export function isSchedulableAsset(asset: Asset) {
  return SCHEDULABLE_ASSET_TYPES.includes(String(asset.asset_type ?? ""));
}

export function buildMonthlyScheduleAssignments({
  assets,
  year,
  month,
  timezone = DEFAULT_PUBLISH_TIMEZONE,
}: {
  assets: Asset[];
  year: number;
  month: number;
  timezone?: string;
}) {
  const firstMonday = firstMondayOfMonth(year, month);
  const grouped = new Map<string, Asset[]>();

  for (const asset of assets.filter(isSchedulableAsset)) {
    const type = String(asset.asset_type ?? "manual");
    const current = grouped.get(type) ?? [];
    current.push(asset);
    grouped.set(type, current);
  }

  const assignments: Array<{
    asset: Asset;
    scheduled_publish_at: string;
    publish_timezone: string;
    scheduling_notes: string;
  }> = [];

  for (const [assetType, typeAssets] of grouped.entries()) {
    const baseSlots = WEEKLY_PUBLISHING_CADENCE.filter((slot) => slot.assetType === assetType);
    const slots = baseSlots.length ? baseSlots : [
      {
        assetType,
        dayOffset: 3,
        hour: 10,
        minute: 0,
        label: "Manual staggered publishing slot",
      },
    ];

    typeAssets.forEach((asset, index) => {
      const weekIndex = Math.floor(index / slots.length);
      const slot = slots[index % slots.length];
      const weekStart = addDays(firstMonday, weekIndex * 7);
      const publishDate = setTime(addDays(weekStart, slot.dayOffset), slot.hour, slot.minute);

      assignments.push({
        asset,
        scheduled_publish_at: publishDate.toISOString(),
        publish_timezone: timezone,
        scheduling_notes: `${slot.label}. Auto-assigned by monthly schedule. Week ${weekIndex + 1}.`,
      });
    });
  }

  return assignments.sort((a, b) =>
    a.scheduled_publish_at.localeCompare(b.scheduled_publish_at)
  );
}

export function scheduleMonthLabel(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}
