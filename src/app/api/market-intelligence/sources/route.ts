import { NextResponse } from "next/server";
import {
  assertResearchProjectForAccount,
  MarketIntelligenceApiError,
  requireMarketIntelligenceApiContext,
} from "@/lib/market-intelligence/api-context";
import { MARKET_RESEARCH_SOURCE_TYPES } from "@/lib/market-intelligence/market-intelligence";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function score(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const { supabase, user, accountId } =
      await requireMarketIntelligenceApiContext();
    const body = await request.json().catch(() => ({}));
    const title = clean(body.title);
    const sourceType = clean(body.sourceType) || "web";
    const projectId = clean(body.projectId) || null;

    if (!title) {
      return NextResponse.json({ error: "Source title is required." }, { status: 400 });
    }

    if (!(MARKET_RESEARCH_SOURCE_TYPES as readonly string[]).includes(sourceType)) {
      return NextResponse.json({ error: "Invalid source type." }, { status: 400 });
    }

    await assertResearchProjectForAccount({ supabase, accountId, projectId });

    const { data: source, error } = await supabase
      .from("market_research_sources")
      .insert({
        account_id: accountId,
        project_id: projectId,
        created_by_user_id: user.id,
        source_type: sourceType,
        title,
        source_url: clean(body.sourceUrl) || null,
        publisher: clean(body.publisher) || null,
        author: clean(body.author) || null,
        published_at: clean(body.publishedAt) || null,
        retrieved_at: new Date().toISOString(),
        summary: clean(body.summary) || null,
        credibility_score: score(body.credibilityScore),
        active: true,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof MarketIntelligenceApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create source." },
      { status: 500 },
    );
  }
}
