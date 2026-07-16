import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { generateOneOffCampaignStrategy } from "@/lib/ai/one-off-strategy-generator";
import { loadDigitalCloneContext } from "@/lib/clone/context";
import { buildCampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import {
  computeOneOffStrategySourceSignature,
  extractOneOffStrategyGate,
  mergeOneOffStrategyGate,
  normalizeOneOffCampaignForPrompt,
  normalizeOneOffCampaignStrategy,
  oneOffStrategyMissingRequired,
  ONE_OFF_STRATEGY_GATE_VERSION,
  type OneOffStrategyGate,
} from "@/lib/content-generation/one-off-strategy-gate";
import { logActivity } from "@/lib/security/auditLog";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import type { Json } from "@/types/database.types";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

type StrategyAction = "generate" | "save" | "approve" | "unlock";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function loadManagedCampaign(campaignId: string) {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      supabase,
      user: null,
      campaign: null,
      accountId: null,
    };
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    return {
      response: NextResponse.json({ error: "Campaign not found." }, { status: 404 }),
      supabase,
      user,
      campaign: null,
      accountId: null,
    };
  }

  const accountId = campaign.account_id ? String(campaign.account_id) : null;

  if (accountId) {
    const access = await getAccountAccessForUser({
      supabase,
      accountId,
      userId: user.id,
    });

    if (!access.canManage) {
      return {
        response: NextResponse.json(
          { error: "You do not have permission to manage this campaign strategy." },
          { status: 403 },
        ),
        supabase,
        user,
        campaign: null,
        accountId,
      };
    }
  } else if (campaign.user_id !== user.id) {
    return {
      response: NextResponse.json(
        { error: "You do not have permission to manage this campaign strategy." },
        { status: 403 },
      ),
      supabase,
      user,
      campaign: null,
      accountId,
    };
  }

  return {
    response: null,
    supabase,
    user,
    campaign,
    accountId,
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const loaded = await loadManagedCampaign(campaignId);

    if (loaded.response || !loaded.user || !loaded.campaign) {
      return loaded.response ?? NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const { supabase, user, campaign, accountId } = loaded;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "generate") as StrategyAction;

    if (!["generate", "save", "approve", "unlock"].includes(action)) {
      return NextResponse.json({ error: "Unknown strategy action." }, { status: 400 });
    }

    const normalizedCampaign = normalizeOneOffCampaignForPrompt(campaign);
    const sourceSignature = computeOneOffStrategySourceSignature(campaign);
    const now = new Date().toISOString();
    const existingGate = extractOneOffStrategyGate(campaign.strategy);
    let nextGate: OneOffStrategyGate;

    if (action === "generate") {
      const cloneContext = await loadDigitalCloneContext(user.id, accountId);
      const intelligence = buildCampaignIntelligenceContext({
        campaign: normalizedCampaign,
        cloneContext,
        enabled: process.env.VIP_DISABLE_CAMPAIGN_INTELLIGENCE !== "1",
      });
      const generated = await generateOneOffCampaignStrategy({
        campaign: normalizedCampaign,
        intelligence,
      });

      nextGate = {
        version: ONE_OFF_STRATEGY_GATE_VERSION,
        status: "draft",
        sourceSignature,
        strategy: generated.strategy,
        generatedAt: now,
        updatedAt: now,
        approvedAt: null,
        approvedBy: null,
        generator: generated.generator,
        intelligenceReadinessScore: intelligence.brief.readinessScore,
        intelligenceMissingElements: intelligence.brief.missingElements,
      };
    } else {
      if (!existingGate) {
        return NextResponse.json(
          { error: "Generate the campaign strategy before saving or approving it." },
          { status: 409 },
        );
      }

      const submittedStrategy = isRecord(body.strategy)
        ? normalizeOneOffCampaignStrategy(body.strategy)
        : existingGate.strategy;

      if (action === "approve") {
        const missing = oneOffStrategyMissingRequired(submittedStrategy);
        if (missing.length) {
          return NextResponse.json(
            {
              error: `Complete these strategy sections before approval: ${missing.join(", ")}.`,
            },
            { status: 400 },
          );
        }
      }

      nextGate = {
        ...existingGate,
        version: ONE_OFF_STRATEGY_GATE_VERSION,
        status: action === "approve" ? "approved" : "draft",
        sourceSignature,
        strategy: submittedStrategy,
        updatedAt: now,
        approvedAt: action === "approve" ? now : null,
        approvedBy: action === "approve" ? user.id : null,
        generator:
          JSON.stringify(submittedStrategy) === JSON.stringify(existingGate.strategy)
            ? existingGate.generator
            : "manual",
      };
    }

    let campaignUpdate = supabase
      .from("campaigns")
      .update({
        strategy: toJson(mergeOneOffStrategyGate(campaign.strategy, nextGate)),
        status: nextGate.status === "approved" ? "strategy_approved" : "strategy_awaiting_approval",
      })
      .eq("id", campaign.id);

    campaignUpdate = accountId
      ? campaignUpdate.eq("account_id", accountId)
      : campaignUpdate.eq("user_id", user.id);

    const { data: updatedCampaign, error: updateError } = await campaignUpdate
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const activityType =
      action === "approve"
        ? "campaign_strategy_approved"
        : action === "generate"
          ? "campaign_strategy_generated"
          : action === "unlock"
            ? "campaign_strategy_unlocked"
            : "campaign_strategy_saved";

    await logActivity(supabase, {
      userId: user.id,
      activityType,
      title:
        action === "approve"
          ? "Campaign strategy approved"
          : action === "generate"
            ? "Campaign strategy generated"
            : action === "unlock"
              ? "Campaign strategy reopened"
              : "Campaign strategy draft saved",
      description: `${campaign.name}: one-off Marketing Spine ${nextGate.status}.`,
      metadata: toJson({
        campaignId: campaign.id,
        accountId,
        strategyVersion: nextGate.version,
        strategyStatus: nextGate.status,
        strategyGenerator: nextGate.generator,
        sourceSignature,
      }),
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      strategyGate: nextGate,
      stale: false,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected campaign strategy error." },
      { status: 500 },
    );
  }
}
