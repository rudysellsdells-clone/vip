import "server-only";

import {
  buildMarketIntelligenceWorkspace,
  normalizeMarketResearchFinding,
  normalizeMarketResearchProject,
  normalizeMarketResearchSource,
} from "./market-intelligence";

type SupabaseLike = {
  from: (table: string) => any;
};

export async function getMarketIntelligenceWorkspace({
  supabase,
  accountId,
}: {
  supabase: SupabaseLike;
  accountId: string;
}) {
  const [projectsResult, sourcesResult, findingsResult] = await Promise.all([
    supabase
      .from("market_research_projects")
      .select("*")
      .eq("account_id", accountId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("market_research_sources")
      .select("*")
      .eq("account_id", accountId)
      .eq("active", true)
      .order("retrieved_at", { ascending: false }),
    supabase
      .from("market_research_findings")
      .select("*")
      .eq("account_id", accountId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
  ]);

  const error = projectsResult.error ?? sourcesResult.error ?? findingsResult.error;
  if (error) {
    throw new Error(error.message ?? "Unable to load market intelligence.");
  }

  return buildMarketIntelligenceWorkspace({
    projects: ((projectsResult.data ?? []) as Record<string, unknown>[]).map(
      normalizeMarketResearchProject,
    ),
    sources: ((sourcesResult.data ?? []) as Record<string, unknown>[]).map(
      normalizeMarketResearchSource,
    ),
    findings: ((findingsResult.data ?? []) as Record<string, unknown>[]).map(
      normalizeMarketResearchFinding,
    ),
  });
}
