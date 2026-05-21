type DraftDetails = {
  draftId: string | null;
  draftUrl: string | null;
  executionId: string | null;
  feedbackUrl: string | null;
};

function parseNestedZapierText(result: Record<string, any> | null | undefined) {
  const text = result?.text;

  if (typeof text !== "string" || !text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function extractWhatIfGmailDraftDetails(metadata: Record<string, any>): DraftDetails {
  const directDraftId = metadata.gmailDraftId ?? null;
  const directDraftUrl = metadata.gmailDraftUrl ?? null;
  const directExecutionId = metadata.zapierExecutionId ?? null;
  const directFeedbackUrl = metadata.zapierFeedbackUrl ?? null;

  const zapierResult =
    metadata.zapierResult && typeof metadata.zapierResult === "object"
      ? metadata.zapierResult
      : null;

  const parsed =
    zapierResult?.parsedText && typeof zapierResult.parsedText === "object"
      ? zapierResult.parsedText
      : parseNestedZapierText(zapierResult);

  return {
    draftId:
      directDraftId ??
      parsed?.results?.draft_id ??
      parsed?.results?.draftId ??
      null,
    draftUrl:
      directDraftUrl ??
      parsed?.results?.draft_url ??
      parsed?.results?.draftUrl ??
      null,
    executionId:
      directExecutionId ??
      parsed?.execution?.id ??
      null,
    feedbackUrl:
      directFeedbackUrl ??
      parsed?.feedbackUrl ??
      null,
  };
}

export type WhatIfGmailActionRecord = {
  id: string;
  createdAt: string;
  status: string;
  title: string;
  description: string;
  toEmail: string | null;
  subject: string | null;
  draftId: string | null;
  draftUrl: string | null;
  executionId: string | null;
  feedbackUrl: string | null;
  attachmentUrl: string | null;
  assetId: string | null;
};

export async function loadRecentWhatIfGmailActions({
  supabase,
  userId,
  limit = 10,
}: {
  supabase: any;
  userId: string;
  limit?: number;
}): Promise<WhatIfGmailActionRecord[]> {
  const { data, error } = await supabase
    .from("asset_exports")
    .select("*")
    .eq("user_id", userId)
    .eq("export_type", "gmail_draft_with_pdf")
    .in("status", ["sent_to_zapier", "completed", "failed"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load What-If Gmail action records", error);
    return [];
  }

  return ((data ?? []) as Array<Record<string, any>>).map((row) => {
    const metadata = (row.metadata ?? {}) as Record<string, any>;
    const details = extractWhatIfGmailDraftDetails(metadata);
    const toEmail = metadata.toEmail ? String(metadata.toEmail) : null;

    return {
      id: row.id,
      createdAt: row.updated_at ?? row.created_at,
      status: row.status,
      title:
        row.status === "completed"
          ? "Gmail draft created"
          : row.status === "failed"
            ? "Gmail draft failed"
            : "Gmail draft sent to Zapier",
      description: toEmail ? `What-If PDF draft for ${toEmail}` : "What-If PDF Gmail draft",
      toEmail,
      subject: row.subject ?? null,
      draftId: details.draftId,
      draftUrl: details.draftUrl,
      executionId: details.executionId,
      feedbackUrl: details.feedbackUrl,
      attachmentUrl: row.file_url ?? metadata.attachmentUrl ?? null,
      assetId: row.asset_id ?? null,
    };
  });
}
