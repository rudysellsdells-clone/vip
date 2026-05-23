import { NextResponse } from "next/server";
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
      assetContent: asset.content ?? "",
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

    const content = [
      `Quality resubmission based on review: ${review.id}`,
      `Original asset ID: ${asset.id}`,
      "",
      result.content,
    ].join("\n");

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
