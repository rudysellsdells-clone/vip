import { NextResponse } from "next/server";
import {
  MarketIntelligenceApiError,
  requireMarketIntelligenceApiContext,
} from "@/lib/market-intelligence/api-context";
import {
  MARKET_RESEARCH_FINDING_STATUSES,
  MARKET_RESEARCH_FINDING_TYPES,
} from "@/lib/market-intelligence/market-intelligence";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function score(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export async function POST(request: Request) {
  try {
    const { supabase, user, accountId } =
      await requireMarketIntelligenceApiContext();
    const body = await request.json().catch(() => ({}));
    const title = clean(body.title);
    const summary = clean(body.summary);
    const findingType = clean(body.findingType);

    if (!title || !summary) {
      return NextResponse.json(
        { error: "Finding title and summary are required." },
        { status: 400 },
      );
    }

    if (!MARKET_RESEARCH_FINDING_TYPES.includes(findingType as never)) {
      return NextResponse.json({ error: "Invalid finding type." }, { status: 400 });
    }

    const { data: finding, error } = await supabase
      .from("market_research_findings")
      .insert({
        account_id: accountId,
        project_id: clean(body.projectId) || null,
        created_by_user_id: user.id,
        finding_type: findingType,
        title,
        summary,
        evidence: clean(body.evidence) || null,
        geography: clean(body.geography) || null,
        confidence_score: score(body.confidenceScore),
        source_ids: stringArray(body.sourceIds),
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ finding }, { status: 201 });
  } catch (error) {
    if (error instanceof MarketIntelligenceApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create finding." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user, accountId } =
      await requireMarketIntelligenceApiContext();
    const body = await request.json().catch(() => ({}));
    const findingId = clean(body.findingId);
    const status = clean(body.status);

    if (!findingId) {
      return NextResponse.json({ error: "Finding ID is required." }, { status: 400 });
    }

    if (!MARKET_RESEARCH_FINDING_STATUSES.includes(status as never)) {
      return NextResponse.json({ error: "Invalid finding status." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const approvalFields =
      status === "approved"
        ? {
            approved_by_user_id: user.id,
            approved_at: now,
            rejected_at: null,
          }
        : status === "rejected"
          ? {
              approved_by_user_id: null,
              approved_at: null,
              rejected_at: now,
            }
          : {
              approved_by_user_id: null,
              approved_at: null,
              rejected_at: null,
            };

    const { data: finding, error } = await supabase
      .from("market_research_findings")
      .update({ status, ...approvalFields })
      .eq("id", findingId)
      .eq("account_id", accountId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ finding });
  } catch (error) {
    if (error instanceof MarketIntelligenceApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update finding." },
      { status: 500 },
    );
  }
}
