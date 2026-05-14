import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/security/auditLog";

type RouteContext = {
  params: Promise<{
    toolRunId: string;
  }>;
};

const CANCELABLE_STATUSES = ["planned", "waiting_approval", "failed"] as const;

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { toolRunId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: toolRun, error: toolRunError } = await supabase
      .from("tool_runs")
      .select("*")
      .eq("id", toolRunId)
      .eq("user_id", user.id)
      .single();

    if (toolRunError || !toolRun) {
      return NextResponse.json({ error: "Tool run not found." }, { status: 404 });
    }

    if (
      !CANCELABLE_STATUSES.includes(
        toolRun.status as (typeof CANCELABLE_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { error: `Tool run cannot be canceled from status "${toolRun.status}".` },
        { status: 400 }
      );
    }

    const { data: updatedToolRun, error: updateError } = await supabase
      .from("tool_runs")
      .update({
        status: "canceled",
        error: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", toolRun.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "zapier_tool_run_canceled",
      title: "Zapier action canceled",
      description: `Canceled ${toolRun.action_name}.`,
      metadata: {
        toolRunId: toolRun.id,
        actionName: toolRun.action_name,
      },
    });

    return NextResponse.json({ success: true, toolRun: updatedToolRun });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error canceling tool run." },
      { status: 500 }
    );
  }
}
