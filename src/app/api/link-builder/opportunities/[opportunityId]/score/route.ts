import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreDirectoryOpportunity } from "@/lib/link-builder/directory-scoring";

type RouteContext = { params: Promise<{ opportunityId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { opportunityId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: opportunity } = await supabase.from("directory_opportunities").select("*").eq("id", opportunityId).eq("user_id", user.id).single();
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });

  const score = scoreDirectoryOpportunity({
    domain: opportunity.domain,
    url: opportunity.url,
    directoryName: opportunity.directory_name,
    directoryType: opportunity.directory_type,
    category: opportunity.category,
    notes: opportunity.notes,
  });

  const { data, error } = await supabase.from("directory_opportunities").update({
    relevance_score: score.relevanceScore,
    quality_score: score.qualityScore,
    risk_score: score.riskScore,
    ai_summary: score.summary,
    status: score.recommendedStatus,
  }).eq("id", opportunityId).eq("user_id", user.id).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ opportunity: data });
}
