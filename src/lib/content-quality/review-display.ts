export type QualityReviewRecord = Record<string, any>;

export function scoreNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

export function qualityScoreLabel(score: number | null) {
  if (score === null) return "Not scored";
  if (score >= 85) return "Strong";
  if (score >= 75) return "Good";
  if (score >= 65) return "Needs review";
  return "Weak";
}

export function qualityScoreTone(score: number | null) {
  if (score === null) return "neutral";
  if (score >= 75) return "pass";
  if (score >= 65) return "warning";
  return "fail";
}

export function latestReviewByAssetId(reviews: QualityReviewRecord[]) {
  const map = new Map<string, QualityReviewRecord>();

  for (const review of reviews) {
    const assetId = String(review.asset_id ?? "");
    if (!assetId) continue;

    const current = map.get(assetId);

    if (!current) {
      map.set(assetId, review);
      continue;
    }

    const currentDate = new Date(String(current.created_at ?? 0)).getTime();
    const reviewDate = new Date(String(review.created_at ?? 0)).getTime();

    if (reviewDate > currentDate) {
      map.set(assetId, review);
    }
  }

  return map;
}

export function reviewStatusLabel({
  asset,
  review,
}: {
  asset: Record<string, any>;
  review?: QualityReviewRecord | null;
}) {
  const workflow = String(asset.quality_workflow_status ?? "not_checked");

  if (!review && workflow === "not_checked") return "Not quality tested";
  if (!review && workflow !== "not_checked") return workflow.replaceAll("_", " ");

  if (workflow === "review_ready") return "Quality tested: review ready";
  if (workflow === "needs_human_review_after_quality") return "Quality tested: needs human review";
  if (workflow === "not_checked") return "Review saved, status not updated";

  return `Quality tested: ${workflow.replaceAll("_", " ")}`;
}

export function normalizeReviewList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return [trimmed];
    }
  }

  return [];
}
