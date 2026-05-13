import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGalaxyAiRun } from "@/lib/galaxyai/client";
import { logActivity } from "@/lib/security/auditLog";
import type { Json } from "@/types/database.types";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function normalizeGalaxyAiStatus(status: unknown) {
  if (typeof status !== "string") {
    return "running";
  }

  const normalized = status.toLowerCase();

  if (
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "completed" ||
    normalized === "failed" ||
    normalized === "canceled"
  ) {
    return normalized;
  }

  return "running";
}

function getFinishedAt(galaxyRun: Record<string, unknown>) {
  const possibleValues = [
    galaxyRun.finishedAt,
    galaxyRun.finished_at,
    galaxyRun.completedAt,
    galaxyRun.completed_at,
  ];

  const match = possibleValues.find((value) => typeof value === "string");

  return typeof match === "string" ? match : new Date().toISOString();
}

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

    let { data: localRun, error: localRunError } = await supabase
      .from("galaxyai_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!localRun && !localRunError) {
      const fallbackResult = await supabase
        .from("galaxyai_runs")
        .select("*")
        .eq("galaxy_run_id", runId)
        .eq("user_id", user.id)
        .maybeSingle();

      localRun = fallbackResult.data;
      localRunError = fallbackResult.error;
    }

    if (localRunError) {
      return NextResponse.json({ error: localRunError.message }, { status: 400 });
    }

    if (!localRun || !localRun.galaxy_run_id) {
      return NextResponse.json({ error: "GalaxyAI run not found." }, { status: 404 });
    }

    const galaxyRun = await getGalaxyAiRun(localRun.galaxy_run_id);
    const galaxyRunRecord = galaxyRun as Record<string, unknown>;
    const status = normalizeGalaxyAiStatus(galaxyRunRecord.status);
    const isFinished =
      status === "completed" || status === "failed" || status === "canceled";

    const { data: updatedRun, error: updateError } = await supabase
      .from("galaxyai_runs")
      .update({
        status,
        output: toJson(galaxyRun),
        error:
          typeof galaxyRunRecord.error === "string"
            ? galaxyRunRecord.error
            : null,
        completed_at: isFinished ? getFinishedAt(galaxyRunRecord) : null,
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
      description: `GalaxyAI run is ${status}.`,
      metadata: {
        localRunId: localRun.id,
        galaxyRunId: localRun.galaxy_run_id,
        status,
      },
    });

    return NextResponse.json({ run: updatedRun, galaxyRun });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error checking GalaxyAI run." },
      { status: 500 }
    );
  }
}
