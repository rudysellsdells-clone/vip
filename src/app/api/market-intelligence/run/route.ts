import { NextResponse } from "next/server";
import {
  MarketIntelligenceApiError,
  requireMarketIntelligenceApiContext,
} from "@/lib/market-intelligence/api-context";
import { processAutomatedMarketResearchRun } from "@/lib/market-intelligence/automated-market-research-runner";

export const maxDuration = 300;

function clean(value: unknown, maxLength = 3000) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trim()}...`
    : normalized;
}

export async function POST(request: Request) {
  try {
    const { supabase, user, accountId, accountName } =
      await requireMarketIntelligenceApiContext();
    const body = await request.json().catch(() => ({}));
    const objective = clean(body.objective);
    const geography = clean(body.geography, 500);
    const knownCompetitors = clean(body.knownCompetitors, 1200);
    const startedAt = new Date().toISOString();
    const reportDate = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Chicago",
    }).format(new Date());

    const { data: project, error: projectError } = await supabase
      .from("market_research_projects")
      .insert({
        account_id: accountId,
        created_by_user_id: user.id,
        title: `Automated market position — ${accountName} — ${reportDate}`,
        objective:
          objective ||
          "Discover competitors, compare market position, and identify realistic gaps the account can fill.",
        industry: null,
        geography: geography || null,
        status: "active",
        started_at: startedAt,
        metadata: {
          automation: {
            status: "running",
            provider: "openai_web_search",
            started_at: startedAt,
          },
        },
      })
      .select("id")
      .single();

    if (projectError || !project?.id) {
      throw new Error(
        projectError?.message || "Unable to create automated research project.",
      );
    }

    const result = await processAutomatedMarketResearchRun({
      supabase,
      userId: user.id,
      accountId,
      projectId: String(project.id),
      objective,
      geography,
      knownCompetitors,
      startedAt,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof MarketIntelligenceApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete automated market research.",
      },
      { status: 500 },
    );
  }
}
