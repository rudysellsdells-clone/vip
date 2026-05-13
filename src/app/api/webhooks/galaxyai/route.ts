import { NextResponse } from "next/server";
import { normalizeGalaxyAiStatus } from "@/lib/galaxyai/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const runId = payload?.runId ?? payload?.id ?? payload?.run?.id;
    const status = normalizeGalaxyAiStatus(payload?.status ?? payload?.run?.status);

    if (!runId || typeof runId !== "string") {
      return NextResponse.json({ error: "Missing run id." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("galaxyai_runs")
      .update({
        status,
        output: payload,
        error: payload?.error ?? payload?.run?.error ?? null,
        webhook_received: true,
        completed_at: status === "completed" || status === "failed" || status === "canceled"
          ? new Date().toISOString()
          : null,
      })
      .eq("galaxy_run_id", runId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected GalaxyAI webhook error." },
      { status: 400 }
    );
  }
}
