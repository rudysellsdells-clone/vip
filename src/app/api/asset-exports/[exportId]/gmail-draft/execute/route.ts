import { NextResponse } from "next/server";
import { executeZapierMcpWriteAction } from "@/lib/zapier/mcp-write-client";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    exportId: string;
  }>;
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
  // This mirrors the normal Zapier action audit pattern so the What-If PDF
  // Gmail draft appears in recent Zapier/actions views. If the project's
  // tool_runs schema is slightly different, we do not block draft creation.
  const payload = {
    user_id: userId,
    source_asset_id: assetId,
    provider: "zapier_mcp",
    tool_name: `${app}.${action}`,
    status,
    input,
    output: output ?? null,
    error: error ?? null,
    metadata: {
      exportId,
      app,
      action,
      feature: "what_if_pdf_gmail_draft",
    },
  };

  const { error: insertError } = await supabase.from("tool_runs").insert(payload);

  if (!insertError) {
    return;
  }

  // Fallback for older/minimal tool_runs schemas that may not include metadata.
  const fallbackPayload = {
    user_id: userId,
    source_asset_id: assetId,
    provider: "zapier_mcp",
    tool_name: `${app}.${action}`,
    status,
    input,
    output: output ?? null,
    error: error ?? null,
  };

  const { error: fallbackError } = await supabase
    .from("tool_runs")
    .insert(fallbackPayload);

  if (fallbackError) {
    await supabase.from("activity_log").insert({
      user_id: userId,
      activity_type: "zapier_tool_run_audit_warning",
      title: "Zapier action audit warning",
      description:
        "Gmail draft execution completed, but VIP could not insert the matching tool_runs record.",
      metadata: {
        assetId,
        exportId,
        app,
        action,
        status,
        insertError: insertError.message,
        fallbackError: fallbackError.message,
      },
    });
  }
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

    await recordZapierToolRun({
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
      },
    });

    return NextResponse.json({
      ok: true,
      export: updatedExport,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Gmail draft execution error.";

    await recordZapierToolRun({
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
      },
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
