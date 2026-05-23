import { NextResponse } from "next/server";
import {
  evaluateQualityGate,
  getOrCreateQualityGateSettings,
  normalizeQualityGateSettings,
  scoreSnapshot,
} from "@/lib/content-quality/quality-gates";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    reviewId: string;
  }>;
};

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
      { error: "Asset not found or has been archived." },
      { status: 404 }
    );
  }

  try {
    const settingsRow = await getOrCreateQualityGateSettings({
      supabase,
      userId: user.id,
    });

    const settings = normalizeQualityGateSettings(settingsRow);
    const evaluation = evaluateQualityGate({
      review,
      settings,
    });

    let updatedAsset = null;

    if (evaluation.decision === "auto_approved") {
      const { data: approvedAsset, error: approveError } = await supabase
        .from("generated_assets")
        .update({
          status: "approved",
        })
        .eq("id", asset.id)
        .eq("user_id", user.id)
        .is("archived_at", null)
        .select("*")
        .single();

      if (approveError) {
        return NextResponse.json({ error: approveError.message }, { status: 400 });
      }

      updatedAsset = approvedAsset;
    }

    const { data: decision, error: decisionError } = await supabase
      .from("quality_gate_decisions")
      .insert({
        user_id: user.id,
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
          evaluatedAt: new Date().toISOString(),
        },
      })
      .select("*")
      .single();

    if (decisionError || !decision) {
      return NextResponse.json(
        { error: decisionError?.message ?? "Unable to save quality gate decision." },
        { status: 400 }
      );
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "quality_gate_evaluated",
      title: "Quality gate evaluated",
      description: evaluation.reason,
      metadata: {
        assetId: asset.id,
        reviewId: review.id,
        decisionId: decision.id,
        evaluation,
        settings,
        autoApproved: evaluation.decision === "auto_approved",
      },
    });

    return NextResponse.json({
      ok: true,
      asset: updatedAsset ?? asset,
      review,
      decision,
      evaluation,
      settings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected quality gate error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
