import { NextResponse } from "next/server";
import { getAssetAccessForUser } from "@/lib/accounts/asset-access";
import { reviewAssetQuality } from "@/lib/content-quality/reviewer";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

function assetStrategyContext(asset: Record<string, any>) {
  const metadata =
    asset.metadata &&
    typeof asset.metadata === "object" &&
    !Array.isArray(asset.metadata)
      ? asset.metadata
      : {};

  const pieces: string[] = [];

  if (metadata.marketingSpine) {
    pieces.push(`Marketing Spine: ${JSON.stringify(metadata.marketingSpine)}`);
  }

  if (metadata.assetBrief) {
    pieces.push(`Asset Brief: ${JSON.stringify(metadata.assetBrief)}`);
  }

  if (Array.isArray(metadata.strategyInheritancePath)) {
    pieces.push(
      `Strategy Inheritance Path: ${metadata.strategyInheritancePath.join(" → ")}`,
    );
  }

  return pieces.join("\n\n");
}

async function loadBrandContext(supabase: any, userId: string) {
  const pieces: string[] = [];

  try {
    const { data: brandVoice } = await supabase
      .from("brand_voice")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (brandVoice) {
      pieces.push(`Brand voice: ${JSON.stringify(brandVoice)}`);
    }
  } catch {
    // Optional table. Ignore if unavailable.
  }

  try {
    const { data: knowledge } = await supabase
      .from("knowledge_items")
      .select("*")
      .eq("user_id", userId)
      .limit(5);

    if (knowledge?.length) {
      pieces.push(`Knowledge context: ${JSON.stringify(knowledge)}`);
    }
  } catch {
    // Optional table. Ignore if unavailable.
  }

  return pieces.join("\n\n");
}

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assetAccess = await getAssetAccessForUser({
    supabase,
    assetId,
    userId: user.id,
  });

  if (!assetAccess.asset || assetAccess.asset.archived_at) {
    return NextResponse.json(
      { error: "Asset not found or has been archived." },
      { status: 404 },
    );
  }

  if (!assetAccess.canManage) {
    return NextResponse.json(
      { error: "You do not have permission to quality-review this asset." },
      { status: 403 },
    );
  }

  const asset = assetAccess.asset;

  try {
    const brandContext = [
      await loadBrandContext(supabase, user.id),
      assetStrategyContext(asset),
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await reviewAssetQuality({
      assetId: asset.id,
      title: asset.title ?? "Untitled asset",
      assetType: asset.asset_type ?? "unknown",
      content: asset.content ?? "",
      brandContext,
    });

    const review = result.review;

    const { data: savedReview, error: reviewError } = await supabase
      .from("asset_quality_reviews")
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        overall_score: review.overall_score,
        brand_voice_score: review.brand_voice_score,
        clarity_score: review.clarity_score,
        cta_score: review.cta_score,
        seo_aio_score: review.seo_aio_score,
        conversion_score: review.conversion_score,
        status: review.status,
        summary: review.summary,
        strengths: review.strengths,
        improvements: review.improvements,
        suggested_revision: review.suggested_revision,
        metadata: {
          model: result.model,
          assetTitle: asset.title,
          assetType: asset.asset_type,
          marketingSpineIncluded: Boolean(assetStrategyContext(asset)),
          reviewedAt: new Date().toISOString(),
          accountId: assetAccess.accountId,
        },
      })
      .select("*")
      .single();

    if (reviewError || !savedReview) {
      return NextResponse.json(
        { error: reviewError?.message ?? "Unable to save quality review." },
        { status: 400 },
      );
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      account_id: assetAccess.accountId,
      activity_type: "asset_quality_reviewed",
      title: "Asset quality reviewed",
      description: asset.title,
      metadata: {
        assetId: asset.id,
        reviewId: savedReview.id,
        overallScore: review.overall_score,
        status: review.status,
        model: result.model,
        accountId: assetAccess.accountId,
      },
    });

    return NextResponse.json({
      ok: true,
      asset,
      review: savedReview,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected quality review error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
