import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
import {
  extractDomain,
  normalizeUrl,
  scoreDirectoryOpportunity,
} from "@/lib/link-builder/directory-scoring";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("directory_opportunities")
    .select("*")
    .eq("account_id", workspace.activeAccountId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ opportunities: data ?? [] });
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
  const url = normalizeUrl(String(formData.get("url") || ""));
  const submitUrl = String(formData.get("submit_url") || "").trim();
  const directoryName = String(formData.get("directory_name") || "").trim();
  const directoryType = String(formData.get("directory_type") || "general").trim();
  const category = String(formData.get("category") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!url) {
    return NextResponse.json({ error: "Directory URL is required." }, { status: 400 });
  }

  const domain = extractDomain(url);
  const score = scoreDirectoryOpportunity({
    domain,
    url,
    directoryName,
    directoryType,
    category,
    notes,
  });

  const { data, error } = await supabase
    .from("directory_opportunities")
    .insert({
      user_id: user.id,
      account_id: workspace.activeAccountId,
      domain,
      url,
      submit_url: submitUrl ? normalizeUrl(submitUrl) : null,
      directory_name: directoryName || domain,
      directory_type: directoryType,
      category: category || null,
      discovery_source: "manual",
      relevance_score: score.relevanceScore,
      quality_score: score.qualityScore,
      risk_score: score.riskScore,
      ai_summary: score.summary,
      notes,
      status: score.recommendedStatus,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: workspace.activeAccountId,
    activity_type: "directory_opportunity_created",
    title: "Directory opportunity created",
    description: data.directory_name ?? data.domain,
    metadata: {
      opportunityId: data.id,
      domain: data.domain,
      status: data.status,
    },
  });

  return NextResponse.json({ opportunity: data });
}
