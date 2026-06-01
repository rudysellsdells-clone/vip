import { NextResponse } from "next/server";
import {
  fastQualityPasses,
  generateFastQualityReview,
} from "@/lib/content-quality/fast-quality-review";
import { readableError } from "@/lib/errors/readable-error";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeMonth(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(text)) return text;

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function assetMonth(asset: Record<string, any>) {
  const values = [
    asset.intended_publish_month,
    asset.scheduled_publish_at,
    asset.planned_publish_date,
    asset.campaign_week_start_date,
    asset.created_at,
  ];

  for (const value of values) {
    if (!value) continue;

    const text = String(value);

    if (/^\d{4}-\d{2}/.test(text)) return text.slice(0, 7);

    const date = new Date(text);

    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
  }

  return null;
}

function isWorkingAsset(asset: Record<string, any>) {
  if (asset.archived_at) return false;
  if (asset.is_active_version === false) return false;
  if (asset.superseded_by_asset_id) return false;
  if (asset.published_at) return false;
  if (String(asset.status ?? "") === "published") return false;
  if (String(asset.scheduling_status ?? "") === "published") return false;

  return true;
}

function batchLimit(value: unknown) {
  const number = Number(value ?? 15);

  if (!Number.isFinite(number)) return 15;

  return Math.max(1, Math.min(25, Math.floor(number)));
}

async function saveQualityReview({
  supabase,
  userId,
  asset,
  review,
  month,
}: {
  supabase: any;
  userId: string;
  asset: Record<string, any>;
  review: ReturnType<typeof generateFastQualityReview>;
  month: string;
}) {
  const { data, error } = await supabase
    .from("asset_quality_reviews")
    .insert({
      user_id: userId,
      asset_id: asset.id,
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
        month,
        assetType: asset.asset_type,
        model: review.model,
        source: review.source,
        route: "bulk-quality-review-fast",
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save quality review.");
  }

  return data;
}

async function markAssetReviewed({
  supabase,
  userId,
  assetId,
  passed,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  passed: boolean;
}) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("generated_assets")
    .update({
      quality_workflow_status: passed ? "review_ready" : "needs_human_review_after_quality",
      quality_checked_at: now,
      review_ready_at: passed ? now : null,
    })
    .eq("id", assetId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
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
    const includeAlreadyChecked = Boolean(body.includeAlreadyChecked);
    const limit = batchLimit(body.batchSize);

    /*
      Important:
      This route intentionally does NOT call OpenAI.
      It is the fast workflow-gating quality pass used during monthly workflow execution.
      Deeper model-based review can be added as a single-asset action later.
    */

    const { data, error } = await supabase
      .from("generated_assets")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_publish_at", { ascending: true, nullsFirst: false })
      .limit(2000);

    if (error) {
      return NextResponse.json({ error: error.message, stage: "load_assets" }, { status: 400 });
    }

    const allAssets = (Array.isArray(data) ? data : []) as Array<Record<string, any>>;
    const monthAssets = allAssets
      .filter(isWorkingAsset)
      .filter((asset) => assetMonth(asset) === month);

    const allReviewableAssets = monthAssets.filter((asset) => {
      if (includeAlreadyChecked) return true;

      const workflowStatus = String(asset.quality_workflow_status ?? "not_checked");

      return workflowStatus === "not_checked" || workflowStatus === "needs_human_review_after_quality";
    });

    const reviewableAssets = allReviewableAssets.slice(0, limit);

    const stats = {
      ok: true,
      month,
      mode: "fast_deterministic",
      batchSize: limit,
      assetCount: monthAssets.length,
      reviewableCount: allReviewableAssets.length,
      remainingAfterBatch: Math.max(0, allReviewableAssets.length - reviewableAssets.length),
      hasMore: allReviewableAssets.length > reviewableAssets.length,
      reviewed: 0,
      scored: 0,
      passed: 0,
      failed: 0,
      skipped: monthAssets.length - allReviewableAssets.length,
      errors: [] as string[],
      durationMs: 0,
    };

    for (const asset of reviewableAssets) {
      try {
        const review = generateFastQualityReview({
          title: asset.title ?? "Untitled asset",
          assetType: asset.asset_type ?? "generated_asset",
          content: asset.content ?? "",
        });

        const passed = fastQualityPasses({
          review,
          assetType: asset.asset_type ?? "generated_asset",
        });

        await saveQualityReview({
          supabase,
          userId: user.id,
          asset,
          review,
          month,
        });

        await markAssetReviewed({
          supabase,
          userId: user.id,
          assetId: asset.id,
          passed,
        });

        stats.reviewed += 1;
        stats.scored += 1;

        if (passed) stats.passed += 1;
        else stats.failed += 1;
      } catch (error) {
        stats.errors.push(`${asset.title ?? asset.id}: ${readableError(error, "Unable to review asset.")}`);
      }
    }

    stats.ok = stats.errors.length === 0;
    stats.durationMs = Date.now() - startedAt;

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "monthly_bulk_quality_review_batch_completed",
      title: "Monthly bulk quality review batch completed",
      description: `${stats.reviewed} asset(s) reviewed for ${month}.`,
      metadata: stats,
    });

    return NextResponse.json({
      ...stats,
      hint:
        stats.reviewed === 0
          ? "No reviews were saved in this batch. Check reviewableCount, skipped count, and errors."
          : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: readableError(error, "Fast bulk quality review failed."),
        hint:
          "This route does not call OpenAI. If it times out, the deployment is likely still running an older route or the database query is blocked.",
      },
      { status: 500 }
    );
  }
}
