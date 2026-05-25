import { NextResponse } from "next/server";
import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";
import {
  failingScoreLabels,
  generateAutoQualityReview,
  passesAutoQualityGate,
} from "@/lib/content-quality/auto-quality-gate";
import { generateQualityResubmission } from "@/lib/content-quality/resubmitter";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function normalizeMonth(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(text)) return text;

  return "";
}

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
  const cleaned = String(title ?? "Untitled Asset").replace(/\s+—\s+Auto Quality Regeneration v\d+$/i, "");
  return `${cleaned} — Auto Quality Regeneration v${version}`;
}

async function insertReview({
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
        autoQualityGate: true,
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save auto quality review.");
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

async function runQualityForAsset({
  supabase,
  userId,
  asset,
  month,
  maxRegenerations,
  autoApprovePassing,
  stats,
}: {
  supabase: any;
  userId: string;
  asset: Record<string, any>;
  month: string;
  maxRegenerations: number;
  autoApprovePassing: boolean;
  stats: {
    scored: number;
    passed: number;
    failed: number;
    regenerated: number;
    autoApproved: number;
    humanReviewNeeded: number;
    errors: string[];
  };
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

  const reviewRow = await insertReview({
    supabase,
    userId,
    assetId: asset.id,
    review,
    metadata: {
      month,
      qualityWorkflowStatus: asset.quality_workflow_status ?? "not_checked",
      autoQualityAttempts: asset.auto_quality_attempts ?? 0,
      autoApprovePassing,
    },
  });

  const passed = passesAutoQualityGate({ review });

  if (passed) {
    stats.passed += 1;

    const updates: Record<string, any> = {
      quality_workflow_status: "review_ready",
      quality_checked_at: new Date().toISOString(),
      review_ready_at: new Date().toISOString(),
      is_active_version: true,
    };

    if (autoApprovePassing) {
      updates.status = "approved";
      stats.autoApproved += 1;
    }

    await markAsset({
      supabase,
      userId,
      assetId: asset.id,
      updates,
    });

    if (autoApprovePassing) {
      await supabase.from("activity_log").insert({
        user_id: userId,
        activity_type: "asset_auto_approved_after_quality_gate",
        title: "Asset auto-approved after quality gate",
        description: asset.title ?? "Untitled asset",
        metadata: {
          month,
          assetId: asset.id,
          reviewId: reviewRow.id,
          scores: review.scores,
        },
      });
    }

    return;
  }

  stats.failed += 1;

  const attempts = Number(asset.auto_quality_attempts ?? 0);
  const canRegenerate = attempts < maxRegenerations;

  if (!canRegenerate) {
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
      `Auto quality gate failed: ${failingScoreLabels({ review }).join(", ")}`,
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
    throw new Error(insertError?.message ?? "Unable to save auto-regenerated asset.");
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
    activity_type: "asset_auto_quality_regenerated",
    title: "Asset auto-regenerated after quality gate",
    description: newAsset.title,
    metadata: {
      month,
      originalAssetId: asset.id,
      newAssetId: newAsset.id,
      reviewId: reviewRow.id,
      scores: review.scores,
      failures: failingScoreLabels({ review }),
      model: regenerated.model,
      autoApprovePassing,
    },
  });

  await runQualityForAsset({
    supabase,
    userId,
    asset: newAsset,
    month,
    maxRegenerations,
    autoApprovePassing,
    stats,
  });
}

export async function POST(request: Request) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const month = normalizeMonth(body.month);
  const maxRegenerations = Math.max(0, Math.min(2, Number(body.maxRegenerations ?? 1)));
  const autoApprovePassing = Boolean(body.autoApprovePassing);

  if (!month) {
    return NextResponse.json(
      { error: "A valid month is required. Expected format: YYYY-MM." },
      { status: 400 }
    );
  }

  const { data: assetsData, error: assetsError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (assetsError) {
    return NextResponse.json({ error: assetsError.message }, { status: 400 });
  }

  const assets = (Array.isArray(assetsData) ? assetsData : [])
    .filter((asset) => assetBelongsToMonth(asset, month))
    .filter((asset) => asset.is_active_version !== false)
    .filter((asset) =>
      ["not_checked", "needs_human_review_after_quality", "auto_regenerated_from_failed_quality"].includes(
        String(asset.quality_workflow_status ?? "not_checked")
      )
    );

  const stats = {
    scored: 0,
    passed: 0,
    failed: 0,
    regenerated: 0,
    autoApproved: 0,
    humanReviewNeeded: 0,
    errors: [] as string[],
  };

  for (const asset of assets) {
    try {
      await runQualityForAsset({
        supabase,
        userId: user.id,
        asset,
        month,
        maxRegenerations,
        autoApprovePassing,
        stats,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected auto quality error.";
      stats.errors.push(`${asset.title ?? asset.id}: ${message}`);
    }
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "monthly_auto_quality_gate_completed",
    title: "Monthly auto quality gate completed",
    description: `Auto quality gate completed for ${month}.`,
    metadata: {
      month,
      maxRegenerations,
      autoApprovePassing,
      assetCount: assets.length,
      stats,
    },
  });

  return NextResponse.json({
    ok: true,
    month,
    assetCount: assets.length,
    autoApprovePassing,
    ...stats,
  });
}
