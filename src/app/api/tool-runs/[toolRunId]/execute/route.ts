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


function isGenericZapierExecutor(toolName: string) {
  return toolName === "execute_zapier_write_action" || toolName === "execute_zapier_read_action";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateZapierToolArgs(toolName: string, toolArgs: Record<string, unknown>) {
  if (!isGenericZapierExecutor(toolName)) {
    return "";
  }

  const selectedApi = typeof toolArgs.selected_api === "string" ? toolArgs.selected_api.trim() : "";

  if (!selectedApi) {
    return "Zapier MCP selected_api is missing for the generic executor.";
  }

  if (!isRecord(toolArgs.params)) {
    return "Zapier MCP params object is missing for the generic executor.";
  }

  if (Object.keys(toolArgs.params).length === 0) {
    return "Zapier MCP params object is empty. The field values must be sent as structured params, not only as instructions.";
  }

  return "";
}

function toolResultContainsError(result: unknown) {
  if (!result || typeof result !== "object") return "";

  const content = (result as { content?: Array<{ text?: string }> }).content;

  if (!Array.isArray(content)) return "";

  const text = content
    .map((item) => (typeof item.text === "string" ? item.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) return "";

  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };

    if (parsed.error || parsed.message?.toLowerCase().includes("error")) {
      return parsed.error ?? parsed.message ?? text;
    }
  } catch {
    // Keep checking text below.
  }

  if (/^MCP error/i.test(text) || /Input validation error/i.test(text)) {
    return text;
  }

  return "";
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
  const preflightError = validateZapierToolArgs(toolName, toolArgs);

  if (preflightError) {
    await supabase
      .from("tool_runs")
      .update({
        status: "failed",
        error: preflightError,
        output: toJsonValue({
          toolName,
          toolArgs,
          error: preflightError,
        }),
      })
      .eq("id", toolRun.id)
      .eq("user_id", user.id);

    return NextResponse.json({ error: preflightError, toolArgs }, { status: 400 });
  }

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

    const resultError = toolResultContainsError(result);

    if (resultError) {
      throw new Error(resultError);
    }

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
