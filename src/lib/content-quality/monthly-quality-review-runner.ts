import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";
import {
  failingScoreLabels,
  generateAutoQualityReview,
  passesAutoQualityGate,
} from "@/lib/content-quality/auto-quality-gate";
import { generateQualityResubmission } from "@/lib/content-quality/resubmitter";

export type MonthlyQualityReviewStats = {
  assetCount: number;
  scored: number;
  passed: number;
  failed: number;
  regenerated: number;
  humanReviewNeeded: number;
  skipped: number;
  errors: string[];
};

function monthFromDateLike(value: unknown) {
  if (!value) return null;

  const text = String(value);

  if (/^\d{4}-\d{2}/.test(text)) return text.slice(0, 7);

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function assetBelongsToMonth(asset: Record<string, any>, month: string) {
  return (
    asset.intended_publish_month === month ||
    monthFromDateLike(asset.planned_publish_date) === month ||
    monthFromDateLike(asset.scheduled_publish_at) === month ||
    monthFromDateLike(asset.campaign_week_start_date) === month
  );
}

function inheritedFields(asset: Record<string, any>) {
  return {
    campaign_id: asset.campaign_id ?? null,
    intended_publish_month: asset.intended_publish_month ?? null,
    planned_publish_date: asset.planned_publish_date ?? null,
    scheduled_publish_at: asset.scheduled_publish_at ?? null,
    publish_timezone: asset.publish_timezone ?? "America/Chicago",
    scheduling_status: asset.scheduling_status ?? "scheduled",
    scheduling_notes: asset.scheduling_notes ?? null,
    campaign_week_number: asset.campaign_week_number ?? null,
    campaign_week_start_date: asset.campaign_week_start_date ?? null,
    calendar_sort_order: asset.calendar_sort_order ?? null,
    calendar_notes: asset.calendar_notes ?? null,
  };
}

function nextTitle(title: string, version: number) {
  const cleaned = String(title ?? "Untitled Asset")
    .replace(/\s+—\s+Auto Quality Regeneration v\d+$/i, "")
    .replace(/\s+—\s+Quality Review Regeneration v\d+$/i, "");

  return `${cleaned} — Quality Review Regeneration v${version}`;
}

async function safeInsertQualityReview({
  supabase,
  userId,
  assetId,
  review,
  metadata,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  review: Awaited<ReturnType<typeof generateAutoQualityReview>>;
  metadata: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("asset_quality_reviews")
    .insert({
      user_id: userId,
      asset_id: assetId,
      summary: review.summary,
      strengths: review.strengths,
      improvements: review.improvements,
      suggested_revision: review.suggestedRevision,
      overall_score: review.scores.overall,
      brand_voice_score: review.scores.brandVoice,
      clarity_score: review.scores.clarity,
      cta_score: review.scores.cta,
      seo_aio_score: review.scores.seoAio,
      conversion_score: review.scores.conversion,
      metadata: {
        ...metadata,
        source: review.source,
        model: review.model,
        bulkQualityReview: true,
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save quality review.");
  }

  return data;
}

async function markAsset({
  supabase,
  userId,
  assetId,
  updates,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  updates: Record<string, any>;
}) {
  const { error } = await supabase
    .from("generated_assets")
    .update(updates)
    .eq("id", assetId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

async function reviewSingleAsset({
  supabase,
  userId,
  asset,
  month,
  regenerateWeakAssets,
  maxRegenerations,
  stats,
}: {
  supabase: any;
  userId: string;
  asset: Record<string, any>;
  month: string;
  regenerateWeakAssets: boolean;
  maxRegenerations: number;
  stats: MonthlyQualityReviewStats;
}) {
  const cleanedContent = preparePublicAssetContent({
    content: asset.content ?? "",
    assetType: asset.asset_type,
    title: asset.title,
  });

  if (cleanedContent !== asset.content) {
    await markAsset({
      supabase,
      userId,
      assetId: asset.id,
      updates: {
        content: cleanedContent,
      },
    });
  }

  const review = await generateAutoQualityReview({
    title: asset.title ?? "Untitled asset",
    assetType: asset.asset_type ?? "generated_asset",
    content: cleanedContent,
  });

  stats.scored += 1;

  const reviewRow = await safeInsertQualityReview({
    supabase,
    userId,
    assetId: asset.id,
    review,
    metadata: {
      month,
      qualityWorkflowStatus: asset.quality_workflow_status ?? "not_checked",
      autoQualityAttempts: asset.auto_quality_attempts ?? 0,
      regenerateWeakAssets,
      maxRegenerations,
    },
  });

  const passed = passesAutoQualityGate({ review });

  if (passed) {
    stats.passed += 1;

    await markAsset({
      supabase,
      userId,
      assetId: asset.id,
      updates: {
        quality_workflow_status: "review_ready",
        quality_checked_at: new Date().toISOString(),
        review_ready_at: new Date().toISOString(),
        is_active_version: true,
      },
    });

    return;
  }

  stats.failed += 1;

  const attempts = Number(asset.auto_quality_attempts ?? 0);

  if (!regenerateWeakAssets || attempts >= maxRegenerations) {
    stats.humanReviewNeeded += 1;

    await markAsset({
      supabase,
      userId,
      assetId: asset.id,
      updates: {
        quality_workflow_status: "needs_human_review_after_quality",
        quality_checked_at: new Date().toISOString(),
        is_active_version: true,
      },
    });

    return;
  }

  const regenerated = await generateQualityResubmission({
    assetTitle: asset.title ?? "Untitled asset",
    assetType: asset.asset_type ?? "generated_asset",
    assetContent: cleanedContent,
    reviewSummary: review.summary,
    strengths: review.strengths,
    improvements: [
      ...review.improvements,
      `Quality gate failed: ${failingScoreLabels({ review }).join(", ")}`,
    ],
    suggestedRevision: review.suggestedRevision,
    scores: {
      overall: review.scores.overall,
      brandVoice: review.scores.brandVoice,
      clarity: review.scores.clarity,
      cta: review.scores.cta,
      seoAio: review.scores.seoAio,
      conversion: review.scores.conversion,
    },
  });

  const nextVersion = Number(asset.version ?? 1) + 1;
  const parentAssetId = asset.parent_asset_id ?? asset.id;

  const { data: newAsset, error: insertError } = await supabase
    .from("generated_assets")
    .insert({
      user_id: userId,
      asset_type: asset.asset_type,
      title: nextTitle(asset.title, nextVersion),
      content: preparePublicAssetContent({
        content: regenerated.content,
        assetType: asset.asset_type,
        title: asset.title,
      }),
      status: "needs_review",
      version: nextVersion,
      parent_asset_id: parentAssetId,
      auto_quality_attempts: attempts + 1,
      quality_workflow_status: "not_checked",
      is_active_version: true,
      ...inheritedFields(asset),
    })
    .select("*")
    .single();

  if (insertError || !newAsset) {
    throw new Error(insertError?.message ?? "Unable to save quality-regenerated asset.");
  }

  stats.regenerated += 1;

  await markAsset({
    supabase,
    userId,
    assetId: asset.id,
    updates: {
      quality_workflow_status: "auto_regenerated_from_failed_quality",
      quality_checked_at: new Date().toISOString(),
      superseded_by_asset_id: newAsset.id,
      is_active_version: false,
    },
  });

  await supabase.from("activity_log").insert({
    user_id: userId,
    activity_type: "asset_bulk_quality_regenerated",
    title: "Asset regenerated by bulk quality review",
    description: newAsset.title,
    metadata: {
      month,
      originalAssetId: asset.id,
      newAssetId: newAsset.id,
      reviewId: reviewRow.id,
      scores: review.scores,
      failures: failingScoreLabels({ review }),
      model: regenerated.model,
    },
  });

  await reviewSingleAsset({
    supabase,
    userId,
    asset: newAsset,
    month,
    regenerateWeakAssets,
    maxRegenerations,
    stats,
  });
}

export async function runMonthlyQualityReview({
  supabase,
  userId,
  month,
  regenerateWeakAssets = true,
  maxRegenerations = 1,
  includeAlreadyChecked = false,
}: {
  supabase: any;
  userId: string;
  month: string;
  regenerateWeakAssets?: boolean;
  maxRegenerations?: number;
  includeAlreadyChecked?: boolean;
}): Promise<MonthlyQualityReviewStats> {
  const { data: assetsData, error: assetsError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (assetsError) {
    throw new Error(assetsError.message);
  }

  const monthAssets = (Array.isArray(assetsData) ? assetsData : [])
    .filter((asset) => assetBelongsToMonth(asset, month))
    .filter((asset) => asset.is_active_version !== false);

  const reviewableAssets = monthAssets.filter((asset) => {
    if (includeAlreadyChecked) return true;

    const status = String(asset.quality_workflow_status ?? "not_checked");

    return status === "not_checked" || status === "needs_human_review_after_quality";
  });

  const stats: MonthlyQualityReviewStats = {
    assetCount: monthAssets.length,
    scored: 0,
    passed: 0,
    failed: 0,
    regenerated: 0,
    humanReviewNeeded: 0,
    skipped: monthAssets.length - reviewableAssets.length,
    errors: [],
  };

  for (const asset of reviewableAssets) {
    try {
      await reviewSingleAsset({
        supabase,
        userId,
        asset,
        month,
        regenerateWeakAssets,
        maxRegenerations: Math.max(0, Math.min(2, maxRegenerations)),
        stats,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected quality review error.";
      stats.errors.push(`${asset.title ?? asset.id}: ${message}`);
    }
  }

  await supabase.from("activity_log").insert({
    user_id: userId,
    activity_type: "monthly_bulk_quality_review_completed",
    title: "Monthly bulk quality review completed",
    description: `Bulk quality review completed for ${month}.`,
    metadata: {
      month,
      regenerateWeakAssets,
      maxRegenerations,
      includeAlreadyChecked,
      stats,
    },
  });

  return stats;
}
