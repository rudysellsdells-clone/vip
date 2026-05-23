export type ScheduleStatus =
  | "due_now"
  | "upcoming"
  | "unscheduled"
  | "published"
  | "skipped";

export function getScheduleStatus(asset: Record<string, any>, now = new Date()): ScheduleStatus {
  if (asset.scheduling_status === "published") return "published";
  if (asset.scheduling_status === "skipped") return "skipped";

  if (!asset.scheduled_publish_at) {
    return "unscheduled";
  }

  const scheduledAt = new Date(asset.scheduled_publish_at);

  if (Number.isNaN(scheduledAt.getTime())) {
    return "unscheduled";
  }

  return scheduledAt.getTime() <= now.getTime() ? "due_now" : "upcoming";
}

export function scheduleStatusLabel(status: ScheduleStatus) {
  switch (status) {
    case "due_now":
      return "Due now";
    case "upcoming":
      return "Upcoming";
    case "unscheduled":
      return "Unscheduled";
    case "published":
      return "Published";
    case "skipped":
      return "Skipped";
    default:
      return "Unknown";
  }
}

export function canExecuteBySchedule(asset: Record<string, any>, now = new Date()) {
  return getScheduleStatus(asset, now) === "due_now";
}

export function scheduleBlockReason(asset: Record<string, any>, now = new Date()) {
  const status = getScheduleStatus(asset, now);

  if (status === "due_now") return null;

  if (status === "upcoming") {
    return "This asset is scheduled for the future. It cannot be executed until its publish time.";
  }

  if (status === "unscheduled") {
    return "This asset needs a scheduled publish date/time before it can be executed.";
  }

  if (status === "published") {
    return "This asset is already marked published.";
  }

  if (status === "skipped") {
    return "This asset is marked skipped.";
  }

  return "This asset is not ready to execute.";
}

export function formatScheduleTime(value: string | null | undefined) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid schedule";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
