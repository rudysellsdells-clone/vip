import { NextResponse } from "next/server";
import { getGalaxyAiRun } from "@/lib/galaxyai/client";
import { normalizeGalaxyAiStatus } from "@/lib/galaxyai/types";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/security/auditLog";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: localRun, error: localError } = await supabase
      .from("galaxyai_runs")
      .select("*")
      .eq("user_id", user.id)
      .or(`id.eq.${runId},galaxy_run_id.eq.${runId}`)
      .single();

    if (localError || !localRun?.galaxy_run_id) {
      return NextResponse.json({ error: "GalaxyAI run not found." }, { status: 404 });
    }

    const galaxyRun = await getGalaxyAiRun(localRun.galaxy_run_id);
    const status = normalizeGalaxyAiStatus(galaxyRun.status);

    const { data: updatedRun, error: updateError } = await supabase
      .from("galaxyai_runs")
      .update({
        status,
        output: galaxyRun,
        error: galaxyRun.error ?? null,
        completed_at: status === "completed" || status === "failed" || status === "canceled"
          ? galaxyRun.finishedAt ?? new Date().toISOString()
          : null,
      })
      .eq("id", localRun.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "galaxyai_run_status_checked",
      title: "GalaxyAI run status checked",
      description: `Run ${localRun.galaxy_run_id} is ${status}.`,
      metadata: { localRunId: localRun.id, galaxyRunId: localRun.galaxy_run_id, status },
    });

    return NextResponse.json({ run: updatedRun, galaxyRun });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error checking GalaxyAI run." },
      { status: 400 }
    );
  }
}
