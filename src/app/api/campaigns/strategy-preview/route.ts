import { NextResponse } from "next/server";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { generateOneOffCampaignStrategy } from "@/lib/ai/one-off-strategy-generator";
import { loadDigitalCloneContext } from "@/lib/clone/context";
import {
  buildOneOffCampaignSource,
  normalizeOneOffCampaignRequestBody,
} from "@/lib/content-generation/one-off-campaign-create";
import { buildCampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import { StrategyQualityGateError } from "@/lib/content-generation/strategy-engine-v2/errors";
import {
  computeOneOffStrategySourceSignature,
  normalizeOneOffCampaignForPrompt,
  ONE_OFF_STRATEGY_GATE_VERSION,
} from "@/lib/content-generation/one-off-strategy-gate";
import {
  appendApprovedMarketIntelligenceToCloneContext,
  computeApprovedMarketIntelligenceSignature,
  getApprovedMarketIntelligenceSnapshot,
} from "@/lib/market-intelligence/approved-market-intelligence";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
import { mergeStrategyFoundationIntoCloneContext } from "@/lib/strategy/strategy-foundation-clone-context";
import {
  computeStrategyApprovalSourceSignature,
  computeStrategyFoundationSignature,
} from "@/lib/strategy/strategy-foundation-signature";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { createCampaignSchema } from "@/lib/validation/campaignSchemas";

export const maxDuration = 60;

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
        {
          error:
            "Select or create an account workspace before building a campaign strategy.",
        },
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

    const sourceCampaign = buildOneOffCampaignSource(input);
    const normalizedCampaign = normalizeOneOffCampaignForPrompt(sourceCampaign);
    const campaignSourceSignature =
      computeOneOffStrategySourceSignature(sourceCampaign);
    const [foundation, legacyCloneContext, marketIntelligenceSnapshot] =
      await Promise.all([
        getApprovedStrategyFoundation({
          supabase,
          accountId: activeAccountId,
        }),
        loadDigitalCloneContext(user.id, activeAccountId),
        getApprovedMarketIntelligenceSnapshot({
          supabase,
          accountId: activeAccountId,
        }),
      ]);
    const strategyFoundationSignature =
      computeStrategyFoundationSignature(foundation);
    const marketIntelligenceSignature = marketIntelligenceSnapshot
      ? computeApprovedMarketIntelligenceSignature(marketIntelligenceSnapshot)
      : null;
    const sourceSignature = computeStrategyApprovalSourceSignature({
      campaignSourceSignature,
      foundationSignature: strategyFoundationSignature,
      marketIntelligenceSignature,
    });
    const foundationCloneContext = mergeStrategyFoundationIntoCloneContext({
      foundation,
      cloneContext: legacyCloneContext,
    });
    const cloneContext = appendApprovedMarketIntelligenceToCloneContext({
      cloneContext: foundationCloneContext,
      snapshot: marketIntelligenceSnapshot,
    });
    const intelligence = buildCampaignIntelligenceContext({
      campaign: normalizedCampaign,
      cloneContext,
      enabled: process.env.VIP_DISABLE_CAMPAIGN_INTELLIGENCE !== "1",
    });
    const generated = await generateOneOffCampaignStrategy({
      campaign: normalizedCampaign,
      intelligence,
    });
    const generatedAt = new Date().toISOString();

    return NextResponse.json({
      accountId: activeAccountId,
      workflowVersion: ONE_OFF_STRATEGY_GATE_VERSION,
      strategy: generated.strategy,
      sourceSignature,
      generator: generated.generator,
      generatedAt,
      intelligenceReadinessScore: intelligence.brief.readinessScore,
      intelligenceMissingElements: intelligence.brief.missingElements,
      strategyFoundationVersion: foundation.version,
      strategyFoundationSignature,
      strategyFoundationGeneratedAt: foundation.generatedAt,
      strategyFoundationReadinessScore: foundation.readiness.score,
      strategyFoundationMissingElements: foundation.readiness.missing,
      marketIntelligenceVersion: marketIntelligenceSnapshot?.version ?? null,
      marketIntelligenceSignature,
      marketIntelligenceFindingCount:
        marketIntelligenceSnapshot?.findings.length ?? 0,
      marketIntelligenceSourceCount:
        marketIntelligenceSnapshot?.sources.length ?? 0,
      strategyEngine: generated.diagnostics,
    });
  } catch (error) {
    if (error instanceof StrategyQualityGateError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
          stage: error.stage,
          strategyDiagnostic: error.diagnostic,
        },
        { status: error.stage === "configuration" ? 503 : 422 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected campaign strategy preview error." },
      { status: 500 },
    );
  }
}
