import "server-only";

import type { AutomatedMarketReport } from "./automated-market-research";
import {
  buildMarketIntelligenceWorkspace,
  normalizeMarketResearchFinding,
  normalizeMarketResearchProject,
  normalizeMarketResearchSource,
} from "./market-intelligence";

type SupabaseLike = {
  from: (table: string) => any;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

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

  const projectRows = (projectsResult.data ?? []) as Record<string, unknown>[];
  const workspace = buildMarketIntelligenceWorkspace({
    projects: projectRows.map(normalizeMarketResearchProject),
    sources: ((sourcesResult.data ?? []) as Record<string, unknown>[]).map(
      normalizeMarketResearchSource,
    ),
    findings: ((findingsResult.data ?? []) as Record<string, unknown>[]).map(
      normalizeMarketResearchFinding,
    ),
  });

  const automatedReports = projectRows
    .map((row) => {
      const metadata = object(row.metadata);
      const report = object(metadata.automated_market_report);
      if (!Object.keys(report).length) return null;

      return {
        projectId: String(row.id ?? ""),
        projectTitle: String(row.title ?? "Automated market report"),
        completedAt: row.completed_at ? String(row.completed_at) : null,
        report: report as unknown as AutomatedMarketReport,
      };
    })
    .filter(Boolean) as Array<{
      projectId: string;
      projectTitle: string;
      completedAt: string | null;
      report: AutomatedMarketReport;
    }>;

  return {
    ...workspace,
    automatedReports,
  };
}
