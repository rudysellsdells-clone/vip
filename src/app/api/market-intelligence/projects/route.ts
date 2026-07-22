import { NextResponse } from "next/server";
import {
  MarketIntelligenceApiError,
  requireMarketIntelligenceApiContext,
} from "@/lib/market-intelligence/api-context";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const { supabase, user, accountId } =
      await requireMarketIntelligenceApiContext();
    const body = await request.json().catch(() => ({}));
    const title = clean(body.title);

    if (!title) {
      return NextResponse.json({ error: "Project title is required." }, { status: 400 });
    }

    const { data: project, error } = await supabase
      .from("market_research_projects")
      .insert({
        account_id: accountId,
        created_by_user_id: user.id,
        title,
        objective: clean(body.objective) || null,
        industry: clean(body.industry) || null,
        geography: clean(body.geography) || null,
        status: body.status === "active" ? "active" : "draft",
        started_at: body.status === "active" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof MarketIntelligenceApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create project." },
      { status: 500 },
    );
  }
}
