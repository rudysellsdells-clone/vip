import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toJsonValue } from "@/lib/utils/json";
import { getZapierToolArgs, getZapierToolName } from "@/lib/zapier/action-registry";
import { callZapierMcpTool } from "@/lib/zapier/mcp-client";

type RouteContext = {
  params: Promise<{
    toolRunId: string;
  }>;
};

function canExecuteToolRun(status: string) {
  return ["planned", "waiting_approval", "failed"].includes(status);
}

export async function POST(_request: Request, context: RouteContext) {
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

  if (toolRun.provider !== "zapier_mcp") {
    return NextResponse.json(
      { error: "Only Zapier MCP tool runs can be executed by this route." },
      { status: 400 }
    );
  }

  if (!canExecuteToolRun(toolRun.status)) {
    return NextResponse.json(
      {
        error:
          "Only planned, waiting_approval, or failed Zapier actions can be executed.",
      },
      { status: 400 }
    );
  }

  const input = toolRun.input ?? {};
  const toolName = getZapierToolName(input, toolRun.action_name);
  const toolArgs = getZapierToolArgs(input, toolRun.action_name, toolName);

  await supabase
    .from("tool_runs")
    .update({
      status: "running",
      error: null,
      approved_by_user: true,
    })
    .eq("id", toolRun.id)
    .eq("user_id", user.id);

  try {
    const result = await callZapierMcpTool({
      toolName,
      args: toolArgs,
      requestId: toolRun.id,
    });

    const output = toJsonValue({
      toolName,
      toolArgs,
      result,
    });

    const { error: updateError } = await supabase
      .from("tool_runs")
      .update({
        status: "completed",
        output,
        error: null,
        completed_at: new Date().toISOString(),
        approved_by_user: true,
      })
      .eq("id", toolRun.id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const inputObject =
      input && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};

    const assetId =
      typeof inputObject.assetId === "string" ? inputObject.assetId : null;

    if (assetId) {
      const policyKey =
        typeof inputObject.policyKey === "string" ? inputObject.policyKey : "";

      const nextStatus = policyKey.includes("gmail") ? "sent" : "published";

      await supabase
        .from("generated_assets")
        .update({
          status: nextStatus,
        })
        .eq("id", assetId)
        .eq("user_id", user.id);
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "zapier_action_executed",
      title: "Zapier action executed",
      description: toolRun.action_name,
      metadata: toJsonValue({
        toolRunId: toolRun.id,
        toolName,
        actionName: toolRun.action_name,
      }),
    });

    return NextResponse.json({
      ok: true,
      toolRunId: toolRun.id,
      toolName,
      result: output,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected Zapier MCP error.";

    await supabase
      .from("tool_runs")
      .update({
        status: "failed",
        error: message,
        output: toJsonValue({
          toolName,
          toolArgs,
          error: message,
        }),
      })
      .eq("id", toolRun.id)
      .eq("user_id", user.id);

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "zapier_action_failed",
      title: "Zapier action failed",
      description: message,
      metadata: toJsonValue({
        toolRunId: toolRun.id,
        toolName,
        actionName: toolRun.action_name,
      }),
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
