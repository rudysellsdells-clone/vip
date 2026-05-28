import { NextResponse } from "next/server";
import { buildMonthlyCampaignPlan } from "@/lib/content-calendar/monthly-campaign-planner";
import { buildBusinessMemoryContext } from "@/lib/content-generation/memory-context";
import { readableError } from "@/lib/errors/readable-error";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function normalizeMonth(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(text)) return text;

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function textValue(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          step: "auth",
          error: userError?.message ?? "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const month = normalizeMonth(body.month);
    const campaignTheme = textValue(body.campaignTheme) || "Authority Growth";
    const businessContext = textValue(body.businessContext);

    const strategy = {
      monthlyObjective: textValue(body.monthlyObjective),
      targetAudience: textValue(body.targetAudience),
      primaryOffer: textValue(body.primaryOffer),
      keyTopics: textValue(body.keyTopics),
      callToAction: textValue(body.callToAction),
      differentiator: textValue(body.differentiator),
      proofPoints: textValue(body.proofPoints),
    };

    const env = {
      hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
      openAiModel: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
      nodeEnv: process.env.NODE_ENV,
    };

    const memory = await buildBusinessMemoryContext({
      supabase,
      userId: user.id,
      campaignTheme,
      businessContext,
      strategy,
    });

    const plan = buildMonthlyCampaignPlan({
      month,
      campaignTheme,
      businessContext,
      strategy,
    });

    const expectedAssets = plan.reduce((sum, week) => sum + week.assets.length, 0);

    const { count: existingCampaignCount, error: existingCampaignError } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("campaign_month", month)
      .is("archived_at", null);

    return NextResponse.json({
      ok: true,
      diagnostic: "monthly_campaign_generation",
      month,
      env,
      auth: {
        userIdPresent: Boolean(user.id),
      },
      memory: {
        hasUsefulMemory: memory.hasUsefulMemory,
        sourceCount: memory.sourceCount,
        sources: memory.sources,
        warningCount: memory.warnings.length,
        warnings: memory.warnings.slice(0, 12),
        contextLength: memory.contextText.length,
      },
      plan: {
        weekCount: plan.length,
        expectedAssets,
        weeks: plan.map((week) => ({
          weekNumber: week.weekNumber,
          campaignName: week.campaignName,
          assetCount: week.assets.length,
          weekStartDate: week.weekStartDate,
          weekEndDate: week.weekEndDate,
        })),
      },
      database: {
        existingCampaignCount: existingCampaignCount ?? 0,
        existingCampaignError: existingCampaignError?.message ?? null,
      },
      nextLikelyIssue: !env.hasOpenAiKey
        ? "OPENAI_API_KEY is missing in Vercel. Memory-backed publish-ready generation requires it."
        : existingCampaignError
          ? "Campaign lookup failed. Check campaigns table/schema."
          : plan.length === 0
            ? "Monthly plan created zero weeks. Check month parsing/week generation."
            : "Diagnostic passed. If generation still fails, the issue is likely inside the OpenAI generation response, content sanity check, or Supabase asset insert.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        diagnostic: "monthly_campaign_generation",
        step: "diagnostic_crash",
        error: readableError(error, "Diagnostic route crashed."),
        details:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
              }
            : error,
      },
      { status: 500 }
    );
  }
}
