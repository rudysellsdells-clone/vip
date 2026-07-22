import { NextResponse } from "next/server";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import {
  buildOneOffCampaignNotes,
  buildOneOffCampaignSource,
  buildOneOffCampaignStoredStrategy,
  normalizeOneOffCampaignRequestBody,
} from "@/lib/content-generation/one-off-campaign-create";
import {
  computeOneOffStrategySourceSignature,
  mergeOneOffStrategyGate,
  normalizeOneOffCampaignStrategy,
  oneOffStrategyMissingRequired,
  ONE_OFF_STRATEGY_GATE_VERSION,
  type OneOffStrategyGate,
} from "@/lib/content-generation/one-off-strategy-gate";
import { logActivity } from "@/lib/security/auditLog";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
import {
  computeStrategyApprovalSourceSignature,
  computeStrategyFoundationSignature,
} from "@/lib/strategy/strategy-foundation-signature";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { createCampaignSchema } from "@/lib/validation/campaignSchemas";
import type { Json } from "@/types/database.types";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function cleanText(value: unknown, maxLength = 5000) {
  const text = String(value ?? "").trim();
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function strategyEngineResolution(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    version: cleanText(record.version, 50),
    promotedOffer: cleanText(record.promotedOffer, 500),
    offerSource: cleanText(record.offerSource, 100),
    offerCategory: cleanText(record.offerCategory, 100),
    selectedAccountOffer: cleanText(record.selectedAccountOffer, 500) || null,
    ignoredOffers: Array.isArray(record.ignoredOffers)
      ? record.ignoredOffers.map((item) => cleanText(item, 500)).filter(Boolean)
      : [],
    conflicts: Array.isArray(record.conflicts)
      ? record.conflicts
          .filter(
            (item) => item && typeof item === "object" && !Array.isArray(item),
          )
          .map((item) => {
            const conflict = item as Record<string, unknown>;
            return {
              code: cleanText(conflict.code, 120),
              severity: conflict.severity === "blocking" ? "blocking" : "warning",
              message: cleanText(conflict.message, 1000),
              winningSource: cleanText(conflict.winningSource, 120),
              ignoredSource: cleanText(conflict.ignoredSource, 120) || null,
            };
          })
          .filter((item) => item.code && item.message)
      : [],
    validationIssueCount: Math.max(
      0,
      Number(record.validationIssueCount) || 0,
    ),
    repairPassUsed: record.repairPassUsed === true,
    deterministicSafeguardsUsed:
      record.deterministicSafeguardsUsed === true,
  };
}

async function accountRecordExists({
  supabase,
  table,
  id,
  accountId,
}: {
  supabase: any;
  table: "service_lines" | "offers";
  id: string | null | undefined;
  accountId: string;
}) {
  if (!id) return true;

  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("account_id", accountId)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function POST(request: Request) {
  try {
    const supabase = untypedSupabase(await createClient());
    const rawBody = (await request.json()) as Record<string, unknown>;
    const input = createCampaignSchema.parse(
      normalizeOneOffCampaignRequestBody(rawBody),
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountContext = await getUserAccountContext({
      supabase,
      userId: user.id,
    });
    const activeAccountId = accountContext.activeAccountId;

    if (!activeAccountId) {
      return NextResponse.json(
        { error: "Select or create an account workspace before creating campaigns." },
        { status: 403 },
      );
    }

    if (
      !(await accountRecordExists({
        supabase,
        table: "service_lines",
        id: input.serviceLineId,
        accountId: activeAccountId,
      }))
    ) {
      return NextResponse.json(
        { error: "Selected service line does not belong to the active account." },
        { status: 400 },
      );
    }

    if (
      !(await accountRecordExists({
        supabase,
        table: "offers",
        id: input.offerId,
        accountId: activeAccountId,
      }))
    ) {
      return NextResponse.json(
        { error: "Selected offer does not belong to the active account." },
        { status: 400 },
      );
    }

    const approvalConfirmed = rawBody.strategyApprovalConfirmed === true;
    const strategyWorkflowVersion = cleanText(
      rawBody.strategyWorkflowVersion,
      50,
    );
    const strategyAccountId = cleanText(rawBody.strategyAccountId, 200);
    const approvedStrategy = normalizeOneOffCampaignStrategy(
      rawBody.approvedStrategy,
    );
    const missingStrategyFields =
      oneOffStrategyMissingRequired(approvedStrategy);
    const submittedSourceSignature = cleanText(
      rawBody.strategySourceSignature,
      200,
    );
    const sourceCampaign = buildOneOffCampaignSource(input);
    const campaignSourceSignature =
      computeOneOffStrategySourceSignature(sourceCampaign);
    const foundation = await getApprovedStrategyFoundation({
      supabase,
      accountId: activeAccountId,
    });
    const foundationSignature =
      computeStrategyFoundationSignature(foundation);
    const currentSourceSignature = computeStrategyApprovalSourceSignature({
      campaignSourceSignature,
      foundationSignature,
    });

    if (
      !approvalConfirmed ||
      !submittedSourceSignature ||
      strategyWorkflowVersion !== ONE_OFF_STRATEGY_GATE_VERSION
    ) {
      return NextResponse.json(
        {
          error:
            "Generate, review, and approve the Marketing Spine before creating the campaign.",
        },
        { status: 409 },
      );
    }

    if (!strategyAccountId || strategyAccountId !== activeAccountId) {
      return NextResponse.json(
        {
          error:
            "The active workspace changed after the strategy was generated. Return to the campaign builder and regenerate the Marketing Spine in the correct workspace.",
        },
        { status: 409 },
      );
    }

    if (missingStrategyFields.length) {
      return NextResponse.json(
        {
          error: `Complete these strategy sections before creating the campaign: ${missingStrategyFields.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    if (submittedSourceSignature !== currentSourceSignature) {
      return NextResponse.json(
        {
          error:
            "Campaign inputs or the approved Strategy Foundation changed after the Marketing Spine was generated. Regenerate and approve the strategy before creating the campaign.",
        },
        { status: 409 },
      );
    }

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: "Rudy McCormick",
      timezone: "America/Chicago",
    });

    const now = new Date().toISOString();
    const submittedGenerator = cleanText(rawBody.strategyGenerator, 30);
    const strategyGenerator: OneOffStrategyGate["generator"] =
      rawBody.strategyEdited === true
        ? "manual"
        : submittedGenerator === "openai" || submittedGenerator === "fallback"
          ? submittedGenerator
          : "manual";
    const intelligenceReadinessScore = Math.max(
      0,
      Math.min(100, Number(rawBody.intelligenceReadinessScore) || 0),
    );
    const intelligenceMissingElements = Array.isArray(
      rawBody.intelligenceMissingElements,
    )
      ? rawBody.intelligenceMissingElements
          .map((item) => cleanText(item, 200))
          .filter(Boolean)
      : [];
    const generatedAt = cleanText(rawBody.strategyGeneratedAt, 100) || now;
    const gate: OneOffStrategyGate = {
      version: ONE_OFF_STRATEGY_GATE_VERSION,
      status: "approved",
      sourceSignature: currentSourceSignature,
      strategy: approvedStrategy,
      generatedAt,
      updatedAt: now,
      approvedAt: now,
      approvedBy: user.id,
      generator: strategyGenerator,
      intelligenceReadinessScore,
      intelligenceMissingElements,
    };
    const submittedStrategyEngine = strategyEngineResolution(
      rawBody.strategyEngine,
    );
    const oneOffCampaignStrategy = {
      ...buildOneOffCampaignStoredStrategy(input),
      strategyFoundation: {
        version: foundation.version,
        signature: foundationSignature,
        capturedAt: now,
        snapshot: {
          accountId: foundation.accountId,
          accountName: foundation.accountName,
          businessTruth: foundation.businessTruth,
          brandExpression: foundation.brandExpression,
          market: foundation.market,
          evidence: foundation.evidence,
          campaignDefaults: foundation.campaignDefaults,
          readiness: foundation.readiness,
          sources: foundation.sources,
        },
      },
      strategyEngine: submittedStrategyEngine,
    };

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        account_id: activeAccountId,
        user_id: user.id,
        service_line_id: input.serviceLineId ?? null,
        offer_id: input.offerId ?? null,
        name: input.name,
        idea: input.idea,
        buyer_segment: input.buyerSegment,
        audience: input.audience ?? input.buyerSegment,
        goal: input.goal,
        platforms: input.platforms,
        tone: input.tone ?? "Clear, practical, confident",
        cta: input.cta,
        notes: buildOneOffCampaignNotes(input) || null,
        strategy: toJson(
          mergeOneOffStrategyGate(oneOffCampaignStrategy, gate),
        ),
        // Intentionally omit campaigns.status. Supabase applies the existing
        // allowed default (`draft`), eliminating status-constraint drift.
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "campaign_created_after_strategy_approval",
      title: "Campaign created from approved strategy",
      description: `Created campaign after Marketing Spine approval: ${campaign.name}`,
      metadata: toJson({
        campaignId: campaign.id,
        accountId: activeAccountId,
        strategyVersion: gate.version,
        strategyStatus: gate.status,
        strategySourceSignature: gate.sourceSignature,
        strategyGenerator: gate.generator,
        strategyFoundationVersion: foundation.version,
        strategyFoundationSignature: foundationSignature,
        strategyFoundationReadinessScore: foundation.readiness.score,
        strategyEngine: submittedStrategyEngine,
      }),
    });

    return NextResponse.json(
      {
        campaign,
        strategyGate: gate,
        strategyFoundation: {
          version: foundation.version,
          signature: foundationSignature,
          readinessScore: foundation.readiness.score,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error creating campaign." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountContext = await getUserAccountContext({
      supabase,
      userId: user.id,
    });
    const activeAccountId = accountContext.activeAccountId;

    if (!activeAccountId) {
      return NextResponse.json({ campaigns: [] });
    }

    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("account_id", activeAccountId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error loading campaigns." },
      { status: 500 },
    );
  }
}
