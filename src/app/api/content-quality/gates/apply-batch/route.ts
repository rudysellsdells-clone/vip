import { NextResponse } from "next/server";
import { runBatchQualityGateEvaluation } from "@/lib/content-quality/batch-quality-gates";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

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
  const limit = Number(body.limit ?? 50);
  const skipExistingReviewDecisions = body.skipExistingReviewDecisions !== false;

  try {
    const result = await runBatchQualityGateEvaluation({
      supabase,
      userId: user.id,
      limit,
      skipExistingReviewDecisions,
    });

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "quality_gates_batch_evaluated",
      title: "Quality gates batch evaluated",
      description: `${result.evaluatedCount} reviewed asset(s) evaluated.`,
      metadata: {
        ...result,
        decisions: result.decisions.map((decision) => ({
          id: decision.id,
          asset_id: decision.asset_id,
          review_id: decision.review_id,
          decision: decision.decision,
          passed: decision.passed,
        })),
      },
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected batch quality gate error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
