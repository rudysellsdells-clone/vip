import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeZapierMcpWriteAction } from "@/lib/zapier/mcp-client";
import { markSourceAssetAfterZapierExecution } from "@/lib/zapier/execution-audit";
import { normalizeZapierToolResult } from "@/lib/zapier/result-utils";
import {
  getFacebookPageLockStatus,
  REQUIRED_FACEBOOK_PAGE_NAME,
} from "@/lib/zapier/execution-policy";
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

const RETRIABLE_FACEBOOK_POST_STATUSES = ["waiting_approval", "failed"] as const;

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPreparedAction(input: unknown): PreparedAction | null {
  if (!isRecord(input)) return null;
  return isRecord(input.preparedAction) ? input.preparedAction : null;
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getParams(preparedAction: PreparedAction) {
  return isRecord(preparedAction.params) ? preparedAction.params : {};
}

function buildFacebookPostInstructions(input: {
  pageValue: string;
  pageHandle: string;
  message: string;
  linkUrl?: string;
}) {
  return `
Create a Facebook Page post using the structured params provided with this tool call.

Critical:
- For the required Facebook Pages "Page" field, use exactly this value:
${input.pageValue}

Allowed Page handle / safety lock:
${input.pageHandle}

Message:
${input.message}

${input.linkUrl?.trim() ? `Link URL:\n${input.linkUrl}` : "No link URL."}

Important safety rules:
- Do not use the display name "Web Search Professionals" as the Page field.
- Do not post to Rudy's personal profile.
- Do not post to any Facebook Page other than the locked Page.
- Do not boost, advertise, or spend money.
- If the exact Page value cannot be used, fail instead of posting somewhere else.
- Return the Facebook post details after creation.
`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const toolRunId = typeof body.toolRunId === "string" ? body.toolRunId : null;

    if (!toolRunId) {
      return NextResponse.json({ error: "toolRunId is required." }, { status: 400 });
    }

    const facebookLock = getFacebookPageLockStatus();

    if (!facebookLock.configured || !facebookLock.pageId) {
      return NextResponse.json(
        {
          error: `Facebook execution is blocked until ZAPIER_FACEBOOK_PAGE_NAME is ${REQUIRED_FACEBOOK_PAGE_NAME} and ZAPIER_FACEBOOK_PAGE_ID is set.`,
        },
        { status: 403 }
      );
    }

    if (facebookLock.pageName !== REQUIRED_FACEBOOK_PAGE_NAME) {
      return NextResponse.json(
        {
          error: `Facebook execution blocked. Expected ${REQUIRED_FACEBOOK_PAGE_NAME}, got ${facebookLock.pageName ?? "empty"}.`,
        },
        { status: 403 }
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

    if (toolRun.provider !== "zapier_mcp" || toolRun.action_name !== "Facebook Pages:page_stream") {
      return NextResponse.json({ error: "This route only executes Facebook Page post actions." }, { status: 400 });
    }

    if (!RETRIABLE_FACEBOOK_POST_STATUSES.includes(toolRun.status as (typeof RETRIABLE_FACEBOOK_POST_STATUSES)[number])) {
      return NextResponse.json({ error: `This Facebook action cannot be executed from status "${toolRun.status}".` }, { status: 400 });
    }

    const preparedAction = getPreparedAction(toolRun.input);
    if (!preparedAction) {
      return NextResponse.json({ error: "Prepared action details are missing." }, { status: 400 });
    }

    const params = getParams(preparedAction);
    const message = getString(params.message);
    const linkUrl = getString(params.link_url) || getString(params.linkUrl);

    if (!message.trim()) {
      return NextResponse.json({ error: "Prepared Facebook post message is missing." }, { status: 400 });
    }

    const zapierParams: Record<string, unknown> = {
      page: facebookLock.pageId,
      message,
    };

    if (linkUrl.trim()) zapierParams.link_url = linkUrl;

    await supabase
      .from("tool_runs")
      .update({ status: "running", approved_by_user: true, error: null })
      .eq("id", toolRun.id)
      .eq("user_id", user.id);

    try {
      const result = await executeZapierMcpWriteAction({
        app: "Facebook Pages",
        action: "page_stream",
        params: zapierParams,
        instructions: buildFacebookPostInstructions({
          pageValue: facebookLock.pageId,
          pageHandle: facebookLock.pageName ?? REQUIRED_FACEBOOK_PAGE_NAME,
          message,
          linkUrl,
        }),
        output:
          "Return the Facebook Page post id, URL if available, Page value used, and confirmation that it was posted only to the locked Page.",
      });

      const normalizedResult = normalizeZapierToolResult(result);

      await markSourceAssetAfterZapierExecution({
        supabase,
        userId: user.id,
        toolRunInput: toolRun.input,
        providerAction: "Facebook Pages:page_stream",
        normalizedResult,
        assetStatus: "published",
      });

      const { data: updatedToolRun, error: updateError } = await supabase
        .from("tool_runs")
        .update({
          status: "completed",
          output: toJson({ normalizedResult, rawResult: result }),
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
        activityType: "facebook_page_post_created",
        title: "Facebook Page post created",
        description: normalizedResult.summary,
        metadata: toJson({
          toolRunId: toolRun.id,
          actionName: "Facebook Pages:page_stream",
          pageName: facebookLock.pageName,
          pageId: facebookLock.pageId,
          externalId: normalizedResult.externalId,
          externalUrl: normalizedResult.externalUrl,
          normalizedResult,
        }),
      });

      return NextResponse.json({ success: true, toolRun: updatedToolRun, result, normalizedResult });
    } catch (executionError) {
      const errorMessage = executionError instanceof Error ? executionError.message : "Unexpected Zapier execution error.";

      await supabase
        .from("tool_runs")
        .update({ status: "failed", error: errorMessage, completed_at: new Date().toISOString() })
        .eq("id", toolRun.id)
        .eq("user_id", user.id);

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected error executing Facebook Page post." }, { status: 500 });
  }
}
