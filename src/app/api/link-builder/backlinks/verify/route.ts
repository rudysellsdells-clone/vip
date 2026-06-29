import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
import { extractDomain, normalizeUrl } from "@/lib/link-builder/directory-scoring";
import { verifyBacklinkInHtml } from "@/lib/link-builder/backlink-verifier";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

async function scopedRowExists({
  supabase,
  table,
  id,
  accountId,
}: {
  supabase: any;
  table: string;
  id: string | null;
  accountId: string;
}) {
  if (!id) return true;

  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("account_id", accountId)
    .maybeSingle();

  return Boolean(data);
}

export async function POST(request: Request) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

  if (!workspace) {
    return NextResponse.json({ error: activeWorkspaceRequiredMessage() }, { status: 400 });
  }

  if (!workspace.canManageActiveAccount) {
    return NextResponse.json({ error: activeWorkspaceManageRequiredMessage() }, { status: 403 });
  }

  const formData = await request.formData();
  const sourceUrl = normalizeUrl(String(formData.get("source_url") || ""));
  const targetUrl = normalizeUrl(String(formData.get("target_url") || ""));
  const submissionId = String(formData.get("submission_id") || "") || null;
  const opportunityId = String(formData.get("opportunity_id") || "") || null;
  const notes = String(formData.get("notes") || "");

  if (!sourceUrl || !targetUrl) {
    return NextResponse.json(
      { error: "Source URL and target URL are required." },
      { status: 400 }
    );
  }

  const [submissionOk, opportunityOk] = await Promise.all([
    scopedRowExists({ supabase, table: "directory_submissions", id: submissionId, accountId: workspace.activeAccountId }),
    scopedRowExists({ supabase, table: "directory_opportunities", id: opportunityId, accountId: workspace.activeAccountId }),
  ]);

  if (!submissionOk || !opportunityOk) {
    return NextResponse.json(
      { error: "Linked directory records do not belong to the active workspace." },
      { status: 403 }
    );
  }

  let verification = {
    found: false,
    linkType: "unknown" as "follow" | "nofollow" | "sponsored" | "ugc" | "unknown",
    anchorText: null as string | null,
    status: "needs_review" as "live" | "not_found" | "nofollow" | "needs_review",
  };

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "RudysVIP-LinkVerifier/1.0",
      },
      signal: AbortSignal.timeout(15000),
    });

    const html = await response.text();

    verification = verifyBacklinkInHtml({
      html,
      targetUrl,
    });
  } catch {
    verification = {
      found: false,
      linkType: "unknown",
      anchorText: null,
      status: "needs_review",
    };
  }

  const { data, error } = await supabase
    .from("acquired_backlinks")
    .insert({
      user_id: user.id,
      account_id: workspace.activeAccountId,
      opportunity_id: opportunityId,
      submission_id: submissionId,
      source_domain: extractDomain(sourceUrl),
      source_url: sourceUrl,
      target_url: targetUrl,
      anchor_text: verification.anchorText,
      link_type: verification.linkType,
      first_seen_at: verification.found ? new Date().toISOString() : null,
      last_checked_at: new Date().toISOString(),
      status: verification.status,
      notes,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (submissionId) {
    await supabase
      .from("directory_submissions")
      .update({
        live_url: sourceUrl,
        status: verification.found ? "live" : "needs_follow_up",
      })
      .eq("id", submissionId)
      .eq("account_id", workspace.activeAccountId);
  }

  if (opportunityId) {
    await supabase
      .from("directory_opportunities")
      .update({
        status: verification.found ? "live" : "submitted",
      })
      .eq("id", opportunityId)
      .eq("account_id", workspace.activeAccountId);
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: workspace.activeAccountId,
    activity_type: "backlink_verified",
    title: verification.found ? "Backlink verified" : "Backlink not found",
    description: sourceUrl,
    metadata: {
      backlinkId: data.id,
      sourceUrl,
      targetUrl,
      status: verification.status,
      linkType: verification.linkType,
    },
  });

  return NextResponse.json({ backlink: data, verification });
}
