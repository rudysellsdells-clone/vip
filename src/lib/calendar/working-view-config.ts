import { CalendarViewMode } from "@/lib/calendar/view-range";

export type WorkingPageKey =
  | "publishing-schedule"
  | "content-calendar"
  | "monthly-review"
  | "approvals"
  | "content-quality"
  | "quality-automation"
  | "publishing-ready";

export const WORKING_VIEW_DEFAULTS: Record<WorkingPageKey, CalendarViewMode> = {
  "publishing-schedule": "week",
  "content-calendar": "month",
  "monthly-review": "month",
  "approvals": "week",
  "content-quality": "week",
  "quality-automation": "week",
  "publishing-ready": "day",
};

export function defaultViewForPage(page: WorkingPageKey): CalendarViewMode {
  return WORKING_VIEW_DEFAULTS[page] ?? "week";
}
