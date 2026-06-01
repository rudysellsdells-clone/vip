import {
  filterAssetsByViewRange,
  groupAssetsByDay,
  CalendarViewRange,
} from "@/lib/calendar/view-range";

export function safeRows(data: unknown) {
  return (Array.isArray(data) ? data : []) as Array<Record<string, any>>;
}

export function pageVisibleAssets({
  assets,
  range,
}: {
  assets: Array<Record<string, any>>;
  range: CalendarViewRange;
}) {
  const visibleAssets = filterAssetsByViewRange(assets, range);
  const groups = groupAssetsByDay(visibleAssets);

  return {
    visibleAssets,
    groups,
  };
}

export function isApprovalCandidate(asset: Record<string, any>) {
  const status = String(asset.status ?? "needs_review");
  const quality = String(asset.quality_workflow_status ?? "");

  if (status === "approved" || status === "published" || status === "rejected") return false;

  return (
    status === "needs_review" ||
    status === "pending_review" ||
    quality === "review_ready" ||
    quality === "needs_human_review_after_quality" ||
    quality === "not_checked"
  );
}

export function isQualityCandidate(asset: Record<string, any>) {
  const status = String(asset.status ?? "needs_review");

  if (status === "published") return false;

  return true;
}

export function isQualityAutomationCandidate(asset: Record<string, any>) {
  const quality = String(asset.quality_workflow_status ?? "not_checked");
  const status = String(asset.status ?? "needs_review");

  if (status === "published" || status === "approved") return false;

  return ["not_checked", "needs_human_review_after_quality", "review_ready"].includes(quality);
}
