import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
import { scoreDirectoryOpportunity } from "@/lib/link-builder/directory-scoring";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    opportunityId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { opportunityId } = await context.params;
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

  const { data: opportunity, error: loadError } = await supabase
    .from("directory_opportunities")
    .select("*")
    .eq("id", opportunityId)
    .eq("account_id", workspace.activeAccountId)
    .single();

  if (loadError || !opportunity) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  const score = scoreDirectoryOpportunity({
    domain: opportunity.domain,
    url: opportunity.url,
    directoryName: opportunity.directory_name,
    directoryType: opportunity.directory_type,
    category: opportunity.category,
    notes: opportunity.notes,
  });

  const { data, error } = await supabase
    .from("directory_opportunities")
    .update({
      relevance_score: score.relevanceScore,
      quality_score: score.qualityScore,
      risk_score: score.riskScore,
      ai_summary: score.summary,
      status: score.recommendedStatus,
    })
    .eq("id", opportunityId)
    .eq("account_id", workspace.activeAccountId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ opportunity: data });
}
