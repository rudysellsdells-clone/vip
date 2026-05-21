import { NextResponse } from "next/server";
import { executeZapierMcpWriteAction } from "@/lib/zapier/mcp-write-client";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    exportId: string;
  }>;
};

type AuditAttempt = {
  label: string;
  ok: boolean;
  error?: string | null;
  data?: Record<string, unknown> | null;
};

function readForm(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function getGmailZapierConfig() {
  return {
    app: process.env.ZAPIER_GMAIL_APP?.trim() || "gmail",
    action: process.env.ZAPIER_GMAIL_CREATE_DRAFT_ACTION?.trim() || "draft_v2",
  };
}

function buildInstructions({
  toEmail,
  ccEmail,
  bccEmail,
  subject,
  body,
  attachmentUrl,
  fileName,
}: {
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  subject: string;
  body: string;
  attachmentUrl: string;
  fileName?: string;
}) {
  return [
    "Create a Gmail draft. Do not send the email.",
    `To: ${toEmail}`,
    ccEmail ? `CC: ${ccEmail}` : "",
    bccEmail ? `BCC: ${bccEmail}` : "",
    `Subject: ${subject}`,
    "",
    "Body:",
    body,
    "",
    "Attachment:",
    `Attach the PDF from this URL: ${attachmentUrl}`,
    fileName ? `Attachment file name: ${fileName}` : "",
    "",
    "Important: Create a draft only. Do not send.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function getToolRunsSample({
  supabase,
  userId,
}: {
  supabase: any;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("tool_runs")
    .select("*")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    return {
      ok: false,
      error: error.message,
      sampleKeys: [],
    };
  }

  const first = Array.isArray(data) && data.length ? data[0] : null;

  return {
    ok: true,
    error: null,
    sampleKeys: first ? Object.keys(first) : [],
  };
}

async function tryInsertToolRun({
  supabase,
  payload,
  label,
}: {
  supabase: any;
  payload: Record<string, unknown>;
  label: string;
}): Promise<AuditAttempt> {
  const { data, error } = await supabase
    .from("tool_runs")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) {
    return {
      label,
      ok: false,
      error: error.message,
      data: null,
    };
  }

  return {
    label,
    ok: true,
    error: null,
    data: data ?? null,
  };
}

async function recordZapierToolRun({
  supabase,
  userId,
  assetId,
  exportId,
  app,
  action,
  status,
  input,
  output,
  error,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  exportId: string;
  app: string;
  action: string;
  status: "completed" | "failed";
  input: Record<string, unknown>;
  output?: Record<string, unknown> | null;
  error?: string | null;
}) {
  const toolName = `${app}.${action}`;
  const now = new Date().toISOString();

  const attempts: AuditAttempt[] = [];

  const primaryPayload = {
    user_id: userId,
    source_asset_id: assetId,
    provider: "zapier_mcp",
    tool_name: toolName,
    status,
    input,
    output: output ?? null,
    error: error ?? null,
    metadata: {
      exportId,
      app,
      action,
      feature: "what_if_pdf_gmail_draft",
      createdBy: "asset_exports_gmail_draft_execute",
    },
  };

  attempts.push(
    await tryInsertToolRun({
      supabase,
      payload: primaryPayload,
      label: "primary_tool_runs_payload",
    })
  );

  if (attempts[attempts.length - 1].ok) {
    return {
      ok: true,
      inserted: attempts[attempts.length - 1],
      attempts,
      sample: null,
    };
  }

  const fallbackPayload = {
    user_id: userId,
    source_asset_id: assetId,
    provider: "zapier_mcp",
    tool_name: toolName,
    status,
    input,
    output: output ?? null,
    error: error ?? null,
  };

  attempts.push(
    await tryInsertToolRun({
      supabase,
      payload: fallbackPayload,
      label: "fallback_without_metadata",
    })
  );

  if (attempts[attempts.length - 1].ok) {
    return {
      ok: true,
      inserted: attempts[attempts.length - 1],
      attempts,
      sample: null,
    };
  }

  const alternateProviderPayload = {
    user_id: userId,
    source_asset_id: assetId,
    tool_provider: "zapier_mcp",
    tool_name: toolName,
    status,
    input,
    output: output ?? null,
    error_message: error ?? null,
  };

  attempts.push(
    await tryInsertToolRun({
      supabase,
      payload: alternateProviderPayload,
      label: "alternate_tool_provider_error_message",
    })
  );

  if (attempts[attempts.length - 1].ok) {
    return {
      ok: true,
      inserted: attempts[attempts.length - 1],
      attempts,
      sample: null,
    };
  }

  const minimalPayload = {
    user_id: userId,
    tool_name: toolName,
    status,
    input,
    output: output ?? null,
  };

  attempts.push(
    await tryInsertToolRun({
      supabase,
      payload: minimalPayload,
      label: "minimal_tool_runs_payload",
    })
  );

  if (attempts[attempts.length - 1].ok) {
    return {
      ok: true,
      inserted: attempts[attempts.length - 1],
      attempts,
      sample: null,
    };
  }

  const legacyPayload = {
    user_id: userId,
    action_type: toolName,
    status,
    request_payload: input,
    response_payload: output ?? null,
    error_message: error ?? null,
    created_at: now,
  };

  attempts.push(
    await tryInsertToolRun({
      supabase,
      payload: legacyPayload,
      label: "legacy_action_type_payload",
    })
  );

  if (attempts[attempts.length - 1].ok) {
    return {
      ok: true,
      inserted: attempts[attempts.length - 1],
      attempts,
      sample: null,
    };
  }

  const sample = await getToolRunsSample({
    supabase,
    userId,
  });

  await supabase.from("activity_log").insert({
    user_id: userId,
    activity_type: "zapier_tool_run_audit_failed",
    title: "Zapier action audit failed",
    description:
      "Gmail draft execution finished, but VIP could not insert a matching tool_runs record.",
    metadata: {
      assetId,
      exportId,
      app,
      action,
      status,
      attempts,
      sample,
    },
  });

  return {
    ok: false,
    inserted: null,
    attempts,
    sample,
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { exportId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const toEmail = readForm(formData, "to_email");
  const ccEmail = readForm(formData, "cc_email");
  const bccEmail = readForm(formData, "bcc_email");

  if (!toEmail) {
    return NextResponse.json({ error: "Recipient email is required." }, { status: 400 });
  }

  const { data: exportRow, error: exportError } = await supabase
    .from("asset_exports")
    .select("*")
    .eq("id", exportId)
    .eq("user_id", user.id)
    .single();

  if (exportError || !exportRow) {
    return NextResponse.json({ error: "Prepared Gmail draft export not found." }, { status: 404 });
  }

  if (exportRow.export_type !== "gmail_draft_with_pdf") {
    return NextResponse.json(
      { error: "This export is not a Gmail draft with PDF export." },
      { status: 400 }
    );
  }

  if (!exportRow.file_url) {
    return NextResponse.json(
      { error: "This Gmail draft export is missing the PDF attachment URL." },
      { status: 400 }
    );
  }

  const subject = exportRow.subject || "Strategic what-if scenario";
  const body = exportRow.body || "";
  const attachmentUrl = exportRow.file_url;
  const { app, action } = getGmailZapierConfig();

  const params = {
    to: toEmail,
    to_email: toEmail,
    email: toEmail,
    recipient: toEmail,
    cc: ccEmail || undefined,
    bcc: bccEmail || undefined,
    subject,
    body,
    message: body,
    attachment: attachmentUrl,
    attachments: attachmentUrl,
    attachment_url: attachmentUrl,
    attachmentUrl,
    file: attachmentUrl,
    file_url: attachmentUrl,
    fileName: exportRow.file_name || "what-if-success-story.pdf",
    file_name: exportRow.file_name || "what-if-success-story.pdf",
  };

  const instructions = buildInstructions({
    toEmail,
    ccEmail,
    bccEmail,
    subject,
    body,
    attachmentUrl,
    fileName: exportRow.file_name,
  });

  const runInput = {
    app,
    action,
    toEmail,
    ccEmail,
    bccEmail,
    subject,
    attachmentUrl,
    fileName: exportRow.file_name || "what-if-success-story.pdf",
    exportId: exportRow.id,
    assetId: exportRow.asset_id,
    params,
  };

  try {
    await supabase
      .from("asset_exports")
      .update({
        status: "sent_to_zapier",
        metadata: {
          ...(exportRow.metadata ?? {}),
          toEmail,
          ccEmail,
          bccEmail,
          zapierApp: app,
          zapierAction: action,
          executionStartedAt: new Date().toISOString(),
        },
      })
      .eq("id", exportRow.id)
      .eq("user_id", user.id);

    const result = await executeZapierMcpWriteAction({
      app,
      action,
      instructions,
      params,
      output:
        "Return the Gmail draft ID, draft URL if available, message ID if available, and whether the PDF attachment was included.",
    });

    const auditResult = await recordZapierToolRun({
      supabase,
      userId: user.id,
      assetId: exportRow.asset_id,
      exportId: exportRow.id,
      app,
      action,
      status: "completed",
      input: runInput,
      output: result,
      error: null,
    });

    const { data: updatedExport, error: updateError } = await supabase
      .from("asset_exports")
      .update({
        status: "completed",
        metadata: {
          ...(exportRow.metadata ?? {}),
          toEmail,
          ccEmail,
          bccEmail,
          zapierApp: app,
          zapierAction: action,
          executedAt: new Date().toISOString(),
          zapierResult: result,
          toolRunsAudit: auditResult,
        },
      })
      .eq("id", exportRow.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "what_if_story_gmail_draft_created",
      title: "What-If Story Gmail draft created",
      description: subject,
      metadata: {
        exportId: exportRow.id,
        assetId: exportRow.asset_id,
        toEmail,
        ccEmail,
        bccEmail,
        attachmentUrl,
        zapierApp: app,
        zapierAction: action,
        result,
        toolRunsAudit: auditResult,
      },
    });

    return NextResponse.json({
      ok: true,
      export: updatedExport,
      result,
      toolRunsAudit: auditResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Gmail draft execution error.";

    const auditResult = await recordZapierToolRun({
      supabase,
      userId: user.id,
      assetId: exportRow.asset_id,
      exportId: exportRow.id,
      app,
      action,
      status: "failed",
      input: runInput,
      output: null,
      error: message,
    });

    await supabase
      .from("asset_exports")
      .update({
        status: "failed",
        metadata: {
          ...(exportRow.metadata ?? {}),
          toEmail,
          ccEmail,
          bccEmail,
          zapierApp: app,
          zapierAction: action,
          failedAt: new Date().toISOString(),
          error: message,
          toolRunsAudit: auditResult,
        },
      })
      .eq("id", exportRow.id)
      .eq("user_id", user.id);

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "what_if_story_gmail_draft_failed",
      title: "What-If Story Gmail draft failed",
      description: message,
      metadata: {
        exportId: exportRow.id,
        assetId: exportRow.asset_id,
        toEmail,
        attachmentUrl,
        zapierApp: app,
        zapierAction: action,
        error: message,
        toolRunsAudit: auditResult,
      },
    });

    return NextResponse.json({ error: message, toolRunsAudit: auditResult }, { status: 400 });
  }
}
