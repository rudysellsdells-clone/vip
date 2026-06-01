import { NextResponse } from "next/server";
import { activateAssetVersion, archiveSiblingAssetVersions, rootAssetId } from "@/lib/assets/asset-lifecycle";
import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";
import { generateQualityResubmission } from "@/lib/content-quality/resubmitter";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

function revisedTitle(title: string, version: number) {
  const cleaned = String(title || "Untitled Asset")
    .replace(/\s+Version\s+\d+$/i, "")
    .replace(/\s+—\s+Quality Resubmission v\d+$/i, "")
    .trim();

  return `${cleaned} Version ${version}`;
}

function inheritedCalendarFields(asset: Record<string, any>) {
  return {
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

export async function POST(_request: Request, context: RouteContext) {
  const { reviewId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: review, error: reviewError } = await supabase
    .from("asset_quality_reviews")
    .select("*")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .single();

  if (reviewError || !review) {
    return NextResponse.json({ error: "Quality review not found." }, { status: 404 });
  }

  const { data: asset, error: assetError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", review.asset_id)
    .eq("user_id", user.id)
    .single();

  if (assetError || !asset) {
    return NextResponse.json({ error: "Original asset not found." }, { status: 404 });
  }

  const rootId = rootAssetId(asset);

  /*
    Idempotency:
    If this review already produced a replacement, return it instead of creating another V2.
    This prevents double-clicks and duplicate requests from creating duplicate replacement assets.
  */
  const { data: existingReplacement } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("parent_asset_id", rootId)
    .eq("metadata->>sourceReviewId", review.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingReplacement?.id) {
    await activateAssetVersion({
      supabase,
      userId: user.id,
      assetId: existingReplacement.id,
      rootId,
    });

    await archiveSiblingAssetVersions({
      supabase,
      userId: user.id,
      rootId,
      activeAssetId: existingReplacement.id,
      reason: "existing_quality_resubmission_reactivated",
    });

    return NextResponse.json({
      ok: true,
      idempotent: true,
      asset: existingReplacement,
    });
  }

  try {
    const { data: currentFamilyVersions } = await supabase
      .from("generated_assets")
      .select("version")
      .eq("user_id", user.id)
      .or(`id.eq.${rootId},parent_asset_id.eq.${rootId}`);

    const highestVersion = Array.isArray(currentFamilyVersions)
      ? currentFamilyVersions.reduce((max, row) => Math.max(max, Number(row.version ?? 1)), 1)
      : Number(asset.version ?? 1);

    const nextVersion = highestVersion + 1;

    const result = await generateQualityResubmission({
      assetTitle: asset.title ?? "Untitled asset",
      assetType: asset.asset_type ?? "generated_asset",
      assetContent: preparePublicAssetContent({
        content: asset.content ?? "",
        assetType: asset.asset_type,
        title: asset.title,
      }),
      reviewSummary: review.summary,
      strengths: review.strengths,
      improvements: review.improvements,
      suggestedRevision: review.suggested_revision,
      scores: {
        overall: review.overall_score,
        brandVoice: review.brand_voice_score,
        clarity: review.clarity_score,
        cta: review.cta_score,
        seoAio: review.seo_aio_score,
        conversion: review.conversion_score,
      },
    });

    const { data: newAsset, error: insertError } = await supabase
      .from("generated_assets")
      .insert({
        user_id: user.id,
        campaign_id: asset.campaign_id ?? null,
        asset_type: asset.asset_type,
        title: revisedTitle(asset.title, nextVersion),
        content: preparePublicAssetContent({
          content: result.content,
          assetType: asset.asset_type,
          title: asset.title,
        }),
        status: "needs_review",
        version: nextVersion,
        parent_asset_id: rootId,
        is_active_version: true,
        quality_workflow_status: "not_checked",
        auto_quality_attempts: Number(asset.auto_quality_attempts ?? 0) + 1,
        metadata: {
          ...(asset.metadata ?? {}),
          source: "quality_resubmission",
          sourceReviewId: review.id,
          originalAssetId: asset.id,
          rootAssetId: rootId,
          model: result.model,
        },
        ...inheritedCalendarFields(asset),
      })
      .select("*")
      .single();

    if (insertError || !newAsset) {
      return NextResponse.json(
        { error: insertError?.message ?? "Unable to save resubmitted asset." },
        { status: 400 }
      );
    }

    await activateAssetVersion({
      supabase,
      userId: user.id,
      assetId: newAsset.id,
      rootId,
    });

    await archiveSiblingAssetVersions({
      supabase,
      userId: user.id,
      rootId,
      activeAssetId: newAsset.id,
      reason: "quality_resubmission_created",
    });

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "asset_quality_resubmission_created",
      title: "Quality resubmission created",
      description: newAsset.title,
      metadata: {
        originalAssetId: asset.id,
        newAssetId: newAsset.id,
        rootAssetId: rootId,
        reviewId: review.id,
        newVersion: nextVersion,
        originalArchived: true,
        model: result.model,
      },
    });

    return NextResponse.json({
      ok: true,
      idempotent: false,
      originalAsset: {
        id: asset.id,
        archived: true,
        supersededByAssetId: newAsset.id,
      },
      review,
      asset: newAsset,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected resubmission error.",
      },
      { status: 400 }
    );
  }
}
