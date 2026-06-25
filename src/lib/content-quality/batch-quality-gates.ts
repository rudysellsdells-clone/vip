import {
  evaluateQualityGate,
  getOrCreateQualityGateSettings,
  normalizeQualityGateSettings,
  scoreSnapshot,
} from "@/lib/content-quality/quality-gates";

export const QUALITY_AUTOMATION_ASSET_TYPES = [
  "blog_post",
  "white_paper",
  "authority_asset",
  "prospect_what_if_story",
  "linkedin_post",
  "facebook_post",
  "email",
  "video_script",
];

export type BatchQualityGateResult = {
  evaluatedCount: number;
  skippedCount: number;
  autoApprovedCount: number;
  readyCount: number;
  needsRevisionCount: number;
  disabledCount: number;
  failedCount: number;
  decisions: Array<Record<string, any>>;
  errors: string[];
};

export function latestByAssetId(rows: Array<Record<string, any>>) {
  const map = new Map<string, Record<string, any>>();

  for (const row of rows) {
    const assetId = String(row.asset_id ?? "");

    if (assetId && !map.has(assetId)) {
      map.set(assetId, row);
    }
  }

  return map;
}

export async function runBatchQualityGateEvaluation({
  supabase,
  userId,
  limit = 50,
  skipExistingReviewDecisions = true,
  accountId = null,
}: {
  supabase: any;
  userId: string;
  limit?: number;
  skipExistingReviewDecisions?: boolean;
  accountId?: string | null;
}): Promise<BatchQualityGateResult> {
  const result: BatchQualityGateResult = {
    evaluatedCount: 0,
    skippedCount: 0,
    autoApprovedCount: 0,
    readyCount: 0,
    needsRevisionCount: 0,
    disabledCount: 0,
    failedCount: 0,
    decisions: [],
    errors: [],
  };

  const settingsRow = await getOrCreateQualityGateSettings({
    supabase,
    userId,
  });

  const settings = normalizeQualityGateSettings(settingsRow);

  let assetsQuery = supabase
    .from("generated_assets")
    .select("id,title,asset_type,status,archived_at,account_id")
    .is("archived_at", null)
    .in("asset_type", QUALITY_AUTOMATION_ASSET_TYPES)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(200, limit)));

  if (accountId) {
    assetsQuery = assetsQuery.eq("account_id", accountId);
  }

  const { data: assetsData, error: assetsError } = await assetsQuery;

  if (assetsError) {
    throw new Error(assetsError.message);
  }

  const assets = (assetsData ?? []) as Array<Record<string, any>>;
  const assetIds = assets.map((asset) => asset.id).filter(Boolean);

  if (!assetIds.length) {
    return result;
  }

  const { data: reviewsData, error: reviewsError } = await supabase
    .from("asset_quality_reviews")
    .select("*")
    .in("asset_id", assetIds)
    .order("created_at", { ascending: false });

  if (reviewsError) {
    throw new Error(reviewsError.message);
  }

  const latestReviews = Array.from(latestByAssetId((reviewsData ?? []) as Array<Record<string, any>>).values());
  const reviewIds = latestReviews.map((review) => review.id).filter(Boolean);

  let existingDecisionReviewIds = new Set<string>();

  if (skipExistingReviewDecisions && reviewIds.length) {
    const { data: existingDecisionsData, error: existingError } = await supabase
      .from("quality_gate_decisions")
      .select("id,review_id")
      .in("review_id", reviewIds);

    if (existingError) {
      throw new Error(existingError.message);
    }

    existingDecisionReviewIds = new Set(
      ((existingDecisionsData ?? []) as Array<Record<string, any>>).map((decision) =>
        String(decision.review_id)
      )
    );
  }

  const assetById = new Map<string, Record<string, any>>(
    assets.map((asset) => [String(asset.id), asset])
  );

  for (const review of latestReviews) {
    if (skipExistingReviewDecisions && existingDecisionReviewIds.has(String(review.id))) {
      result.skippedCount += 1;
      continue;
    }

    const asset = assetById.get(String(review.asset_id));

    if (!asset) {
      result.skippedCount += 1;
      continue;
    }

    try {
      const evaluation = evaluateQualityGate({
        review,
        settings,
      });

      let updatedAsset = asset;

      if (evaluation.decision === "auto_approved") {
        let approveQuery = supabase
          .from("generated_assets")
          .update({
            status: "approved",
          })
          .eq("id", asset.id)
          .is("archived_at", null);

        approveQuery = accountId
          ? approveQuery.eq("account_id", accountId)
          : approveQuery.eq("user_id", userId);

        const { data: approvedAsset, error: approveError } = await approveQuery
          .select("id,title,asset_type,status")
          .single();

        if (approveError) {
          throw new Error(approveError.message);
        }

        updatedAsset = approvedAsset ?? asset;
      }

      const { data: decision, error: decisionError } = await supabase
        .from("quality_gate_decisions")
        .insert({
          user_id: userId,
          asset_id: asset.id,
          review_id: review.id,
          decision: evaluation.decision,
          passed: evaluation.passed,
          reason: evaluation.reason,
          settings_snapshot: settings,
          score_snapshot: scoreSnapshot(review),
          metadata: {
            assetTitle: asset.title,
            assetType: asset.asset_type,
            batchEvaluated: true,
            evaluatedAt: new Date().toISOString(),
            updatedAssetStatus: updatedAsset?.status ?? asset.status,
            accountId,
          },
        })
        .select("*")
        .single();

      if (decisionError || !decision) {
        throw new Error(decisionError?.message ?? "Unable to save quality gate decision.");
      }

      result.evaluatedCount += 1;
      result.decisions.push(decision);

      if (evaluation.decision === "auto_approved") result.autoApprovedCount += 1;
      if (evaluation.decision === "ready_for_publishing") result.readyCount += 1;
      if (evaluation.decision === "needs_revision") result.needsRevisionCount += 1;
      if (evaluation.decision === "disabled") result.disabledCount += 1;
    } catch (error) {
      result.failedCount += 1;
      result.errors.push(
        error instanceof Error
          ? `${asset.title ?? asset.id}: ${error.message}`
          : `${asset.title ?? asset.id}: Unknown quality gate error`
      );
    }
  }

  return result;
}