import { NextResponse } from "next/server";
import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";
import { generateQualityResubmission } from "@/lib/content-quality/resubmitter";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    reviewId: string;
  }>;
};

function revisedTitle(title: string, version: number) {
  const cleaned = String(title || "Untitled Asset").trim();

  if (/quality resubmission/i.test(cleaned)) {
    return cleaned;
  }

  return `${cleaned} — Quality Resubmission v${version}`;
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
    return NextResponse.json(
      { error: "Quality review not found." },
      { status: 404 }
    );
  }

  const { data: asset, error: assetError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", review.asset_id)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .single();

  if (assetError || !asset) {
    return NextResponse.json(
      { error: "Original asset not found or has been archived." },
      { status: 404 }
    );
  }

  try {
    const nextVersion = Number(asset.version ?? 1) + 1;

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

    /*
      Important:
      Do not prepend review IDs, original asset IDs, or new asset IDs to public content.
      Those belong in activity_log.metadata, not in the generated asset body.
    */
    const content = preparePublicAssetContent({
      content: result.content,
      assetType: asset.asset_type,
      title: asset.title,
    });

    const { data: newAsset, error: insertError } = await supabase
      .from("generated_assets")
      .insert({
        user_id: user.id,
        campaign_id: asset.campaign_id ?? null,
        asset_type: asset.asset_type,
        title: revisedTitle(asset.title, nextVersion),
        content,
        status: "needs_review",
        version: nextVersion,
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

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "asset_quality_resubmission_created",
      title: "Quality resubmission created",
      description: newAsset.title,
      metadata: {
        originalAssetId: asset.id,
        newAssetId: newAsset.id,
        reviewId: review.id,
        originalVersion: asset.version,
        newVersion: nextVersion,
        model: result.model,
        scores: {
          overall: review.overall_score,
          brandVoice: review.brand_voice_score,
          clarity: review.clarity_score,
          cta: review.cta_score,
          seoAio: review.seo_aio_score,
          conversion: review.conversion_score,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      originalAsset: asset,
      review,
      asset: newAsset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected resubmission error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
