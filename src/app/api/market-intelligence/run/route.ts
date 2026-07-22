import { NextResponse } from "next/server";
import { logActivity } from "@/lib/security/auditLog";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
import {
  MarketIntelligenceApiError,
  requireMarketIntelligenceApiContext,
} from "@/lib/market-intelligence/api-context";
import {
  runAutomatedMarketResearch,
  type AutomatedMarketReport,
} from "@/lib/market-intelligence/automated-market-research";

export const maxDuration = 60;

function clean(value: unknown, maxLength = 3000) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trim()}...`
    : normalized;
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

function sourceIdsForUrls(
  urls: string[],
  sourceIdByUrl: Map<string, string>,
) {
  return [...new Set(
    urls
      .map((url) => sourceIdByUrl.get(canonicalUrl(url)))
      .filter((value): value is string => Boolean(value)),
  )];
}

function buildFindingRows({
  accountId,
  userId,
  projectId,
  geography,
  report,
  sourceIdByUrl,
  allSourceIds,
}: {
  accountId: string;
  userId: string;
  projectId: string;
  geography: string;
  report: AutomatedMarketReport;
  sourceIdByUrl: Map<string, string>;
  allSourceIds: string[];
}) {
  const rows: Array<Record<string, unknown>> = [
    {
      account_id: accountId,
      project_id: projectId,
      created_by_user_id: userId,
      finding_type: "proof",
      title: "Current market position",
      summary: report.marketPosition,
      evidence: report.executiveSummary,
      geography: geography || null,
      confidence_score: report.sources.length >= 5 ? 85 : 70,
      source_ids: allSourceIds.slice(0, 20),
      status: "draft",
      metadata: { automated: true, report_version: report.version },
    },
  ];

  for (const competitor of report.competitors.slice(0, 8)) {
    rows.push({
      account_id: accountId,
      project_id: projectId,
      created_by_user_id: userId,
      finding_type: "competitor",
      title: competitor.name,
      summary: competitor.positioning,
      evidence: [
        competitor.strengths.length
          ? `Observed strengths: ${competitor.strengths.join("; ")}`
          : "",
        competitor.weaknesses.length
          ? `Potential weaknesses or openings: ${competitor.weaknesses.join("; ")}`
          : "",
        competitor.notableOffers.length
          ? `Notable offers: ${competitor.notableOffers.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      geography: geography || null,
      confidence_score: 80,
      source_ids: sourceIdsForUrls(competitor.sourceUrls, sourceIdByUrl),
      status: "draft",
      metadata: {
        automated: true,
        website_url: competitor.websiteUrl || null,
        report_version: report.version,
      },
    });
  }

  for (const gap of report.gaps.slice(0, 12)) {
    rows.push({
      account_id: accountId,
      project_id: projectId,
      created_by_user_id: userId,
      finding_type: "market_opportunity",
      title: gap.title,
      summary: gap.description,
      evidence: [
        gap.whyFillable ? `Why it appears fillable: ${gap.whyFillable}` : "",
        gap.recommendedAction ? `Recommended action: ${gap.recommendedAction}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      geography: geography || null,
      confidence_score: gap.confidenceScore,
      source_ids: sourceIdsForUrls(gap.sourceUrls, sourceIdByUrl),
      status: "draft",
      metadata: {
        automated: true,
        gap_category: gap.category,
        report_version: report.version,
      },
    });
  }

  for (const demand of report.searchDemand.slice(0, 10)) {
    rows.push({
      account_id: accountId,
      project_id: projectId,
      created_by_user_id: userId,
      finding_type: "search_demand",
      title: demand.topic,
      summary: demand.opportunity,
      evidence: demand.intent ? `Observed or inferred intent: ${demand.intent}` : null,
      geography: geography || null,
      confidence_score: demand.confidenceScore,
      source_ids: sourceIdsForUrls(demand.sourceUrls, sourceIdByUrl),
      status: "draft",
      metadata: { automated: true, report_version: report.version },
    });
  }

  for (const risk of report.risks.slice(0, 8)) {
    rows.push({
      account_id: accountId,
      project_id: projectId,
      created_by_user_id: userId,
      finding_type: "risk",
      title: risk.title,
      summary: risk.description,
      evidence: risk.mitigation ? `Mitigation: ${risk.mitigation}` : null,
      geography: geography || null,
      confidence_score: risk.confidenceScore,
      source_ids: sourceIdsForUrls(risk.sourceUrls, sourceIdByUrl),
      status: "draft",
      metadata: { automated: true, report_version: report.version },
    });
  }

  return rows.filter((row) => clean(row.title) && clean(row.summary));
}

export async function POST(request: Request) {
  let projectId: string | null = null;
  let context: Awaited<ReturnType<typeof requireMarketIntelligenceApiContext>> | null = null;

  try {
    context = await requireMarketIntelligenceApiContext();
    const { supabase, user, accountId, accountName } = context;
    const body = await request.json().catch(() => ({}));
    const objective = clean(body.objective);
    const geography = clean(body.geography, 500);
    const knownCompetitors = clean(body.knownCompetitors, 1200);
    const now = new Date().toISOString();
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
        started_at: now,
        metadata: {
          automation: {
            status: "running",
            provider: "openai_web_search",
            started_at: now,
          },
        },
      })
      .select("*")
      .single();

    if (projectError || !project?.id) {
      throw new Error(projectError?.message || "Unable to create automated research project.");
    }
    projectId = String(project.id);

    const foundation = await getApprovedStrategyFoundation({ supabase, accountId });
    const automated = await runAutomatedMarketResearch({
      foundation,
      objective,
      geography,
      knownCompetitors,
    });
    const report = automated.report;

    const sourceRows = report.sources.map((source) => ({
      account_id: accountId,
      project_id: projectId,
      created_by_user_id: user.id,
      source_type: "web",
      title: source.title || source.url,
      source_url: source.url,
      publisher: source.publisher || null,
      author: null,
      published_at: null,
      retrieved_at: new Date().toISOString(),
      summary: source.summary || null,
      credibility_score: 75,
      active: true,
      metadata: {
        automated: true,
        provider: "openai_web_search",
        response_id: automated.responseId || null,
      },
    }));

    const { data: savedSources, error: sourceError } = sourceRows.length
      ? await supabase
          .from("market_research_sources")
          .insert(sourceRows)
          .select("id,source_url")
      : { data: [], error: null };

    if (sourceError) throw new Error(sourceError.message);

    const sourceIdByUrl = new Map<string, string>();
    for (const source of savedSources ?? []) {
      if (!source.source_url || !source.id) continue;
      sourceIdByUrl.set(canonicalUrl(String(source.source_url)), String(source.id));
    }
    const allSourceIds = [...sourceIdByUrl.values()];
    const findingRows = buildFindingRows({
      accountId,
      userId: user.id,
      projectId,
      geography,
      report,
      sourceIdByUrl,
      allSourceIds,
    });

    const { data: savedFindings, error: findingError } = findingRows.length
      ? await supabase
          .from("market_research_findings")
          .insert(findingRows)
          .select("id")
      : { data: [], error: null };

    if (findingError) throw new Error(findingError.message);

    const completedAt = new Date().toISOString();
    const { error: completionError } = await supabase
      .from("market_research_projects")
      .update({
        status: "complete",
        completed_at: completedAt,
        metadata: {
          automation: {
            status: "complete",
            provider: "openai_web_search",
            model: automated.model,
            response_id: automated.responseId || null,
            started_at: now,
            completed_at: completedAt,
            source_count: allSourceIds.length,
            finding_count: savedFindings?.length ?? 0,
          },
          automated_market_report: report,
        },
      })
      .eq("id", projectId)
      .eq("account_id", accountId);

    if (completionError) throw new Error(completionError.message);

    await logActivity(supabase, {
      userId: user.id,
      activityType: "automated_market_research_completed",
      title: "Automated market research completed",
      description: report.executiveSummary || report.reportTitle,
      metadata: {
        accountId,
        projectId,
        model: automated.model,
        sourceCount: allSourceIds.length,
        findingCount: savedFindings?.length ?? 0,
      },
    });

    return NextResponse.json(
      {
        projectId,
        report,
        sourceCount: allSourceIds.length,
        findingCount: savedFindings?.length ?? 0,
      },
      { status: 201 },
    );
  } catch (error) {
    if (context && projectId) {
      const failedAt = new Date().toISOString();
      await context.supabase
        .from("market_research_projects")
        .update({
          status: "draft",
          completed_at: failedAt,
          metadata: {
            automation: {
              status: "failed",
              failed_at: failedAt,
              error: error instanceof Error ? clean(error.message, 1500) : "Unknown error",
            },
          },
        })
        .eq("id", projectId)
        .eq("account_id", context.accountId);
    }

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
