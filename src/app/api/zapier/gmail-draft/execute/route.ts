import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeZapierMcpWriteAction } from "@/lib/zapier/mcp-client";
import { logActivity } from "@/lib/security/auditLog";
import type { Json } from "@/types/database.types";

type PreparedAction = {
  app?: unknown;
  action?: unknown;
  actionName?: unknown;
  instructions?: unknown;
  output?: unknown;
  params?: unknown;
};

const RETRIABLE_GMAIL_DRAFT_STATUSES = ["waiting_approval", "failed"] as const;

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPreparedAction(input: unknown): PreparedAction | null {
  if (!isRecord(input)) {
    return null;
  }

  const preparedAction = input.preparedAction;

  if (!isRecord(preparedAction)) {
    return null;
  }

  return preparedAction;
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getParams(preparedAction: PreparedAction) {
  return isRecord(preparedAction.params) ? preparedAction.params : {};
}

function buildGmailDraftInstructions(input: {
  subject: string;
  body: string;
  to?: string;
}) {
  return `
Create a Gmail draft only. Do not send the email.

Recipient:
${input.to?.trim() ? input.to : "Leave recipient blank unless Gmail requires one."}

Subject:
${input.subject}

Body:
${input.body}

Body type: plain text.

Important:
- Create a draft only.
- Do not send.
- Do not archive, label, or delete anything.
- Return the draft details after creation.
`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const toolRunId =
      typeof body.toolRunId === "string" ? body.toolRunId : null;

    if (!toolRunId) {
      return NextResponse.json(
        { error: "toolRunId is required." },
        { status: 400 }
      );
    }

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
        { error: "This tool run is not a Zapier MCP action." },
        { status: 400 }
      );
    }

    if (toolRun.action_name !== "Gmail:draft_v2") {
      return NextResponse.json(
        { error: "Sprint 5.1 only executes Gmail draft actions." },
        { status: 400 }
      );
    }

    if (
      !RETRIABLE_GMAIL_DRAFT_STATUSES.includes(
        toolRun.status as (typeof RETRIABLE_GMAIL_DRAFT_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error: `This Gmail draft action cannot be executed from status "${toolRun.status}". Prepare a new action or retry a failed one.`,
        },
        { status: 400 }
      );
    }

    const preparedAction = getPreparedAction(toolRun.input);

    if (!preparedAction) {
      return NextResponse.json(
        { error: "Prepared action details are missing." },
        { status: 400 }
      );
    }

    const params = getParams(preparedAction);
    const subject = getString(params.subject, "Draft from Rudy's Marketing Twin");
    const emailBody = getString(params.body);

    if (!emailBody.trim()) {
      return NextResponse.json(
        { error: "Prepared Gmail draft body is missing." },
        { status: 400 }
      );
    }

    const to = getString(params.to);
    const instructions = buildGmailDraftInstructions({
      subject,
      body: emailBody,
      to,
    });

    await supabase
      .from("tool_runs")
      .update({
        status: "running",
        approved_by_user: true,
        error: null,
      })
      .eq("id", toolRun.id)
      .eq("user_id", user.id);

    try {
      const result = await executeZapierMcpWriteAction({
        app: "Gmail",
        action: "draft_v2",
        instructions,
        output:
          "Return the Gmail draft id, draft URL if available, subject, recipient if any, and a short confirmation that the email was created as a draft only.",
      });

      const { data: updatedToolRun, error: updateError } = await supabase
        .from("tool_runs")
        .update({
          status: "completed",
          output: toJson(result),
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
        activityType: "gmail_draft_created",
        title: "Gmail draft created",
        description: `Created Gmail draft for ${subject}.`,
        metadata: toJson({
          toolRunId: toolRun.id,
          result,
        }),
      });

      return NextResponse.json({
        success: true,
        toolRun: updatedToolRun,
        result,
      });
    } catch (executionError) {
      const message =
        executionError instanceof Error
          ? executionError.message
          : "Unexpected Zapier execution error.";

      await supabase
        .from("tool_runs")
        .update({
          status: "failed",
          error: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", toolRun.id)
        .eq("user_id", user.id);

      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error executing Gmail draft." },
      { status: 500 }
    );
  }
}
