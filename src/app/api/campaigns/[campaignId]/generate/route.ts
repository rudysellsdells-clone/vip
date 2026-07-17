import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";
import { loadDigitalCloneContext } from "@/lib/clone/context";
import { generateMarketingAssetPackWithCloneMemory } from "@/lib/ai/asset-pack-generator";
import { marketingAssetPackToAssets } from "@/lib/ai/asset-pack-types";
import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";
import { buildCampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import {
  approvedStrategySummary,
  computeOneOffStrategySourceSignature,
  extractOneOffStrategyGate,
  mergeOneOffStrategyGate,
  normalizeOneOffCampaignForPrompt,
} from "@/lib/content-generation/one-off-strategy-gate";
import {
  formatResolvedCampaignFactsForAssets,
  resolveCampaignBrief,
} from "@/lib/content-generation/strategy-engine-v2/campaign-brief-resolver";
import type { Json } from "@/types/database.types";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}


type InsertedGeneratedAsset = {
  id: string;
  asset_type: string;
  metadata: Json | null;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const accountId = campaign.account_id ? String(campaign.account_id) : null;

    if (accountId) {
      const access = await getAccountAccessForUser({ supabase, accountId, userId: user.id });
      if (!access.canManage) {
        return NextResponse.json(
          { error: "You do not have permission to generate assets for this campaign." },
          { status: 403 },
        );
      }
    } else if (campaign.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to generate assets for this campaign." },
        { status: 403 },
      );
    }

    const strategyGate = extractOneOffStrategyGate(campaign.strategy);
    const currentSourceSignature = computeOneOffStrategySourceSignature(campaign);

    if (!strategyGate || strategyGate.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Generate, review, and approve the campaign strategy before creating content assets.",
        },
        { status: 409 },
      );
    }

    if (strategyGate.sourceSignature !== currentSourceSignature) {
      return NextResponse.json(
        {
          error:
            "Campaign inputs changed after strategy approval. Rebuild and approve the Marketing Spine before generating assets.",
        },
        { status: 409 },
      );
    }

    const cloneContext = await loadDigitalCloneContext(user.id, accountId);
    const normalizedCampaign = normalizeOneOffCampaignForPrompt(campaign);
    const campaignIntelligence = buildCampaignIntelligenceContext({
      campaign: normalizedCampaign,
      cloneContext,
      enabled: process.env.VIP_DISABLE_CAMPAIGN_INTELLIGENCE !== "1",
    });

    const resolvedCampaignBrief = resolveCampaignBrief({
      campaign: normalizedCampaign,
      intelligence: campaignIntelligence,
    });
    const oneOffCampaignStrategy = normalizedCampaign.strategy;
    const approvedCampaignStrategy = strategyGate.strategy;
    const approvedExecutionCampaign = {
      ...normalizedCampaign,
      idea: approvedCampaignStrategy.campaignPointOfView,
      buyer_segment: approvedCampaignStrategy.targetAudience,
      audience: approvedCampaignStrategy.targetAudience,
      goal: approvedCampaignStrategy.campaignObjective,
      cta: approvedCampaignStrategy.primaryCta,
      notes: null,
      strategy: {
        approvedCampaignStrategy,
      },
    };
    const verifiedCampaignFacts = formatResolvedCampaignFactsForAssets(
      resolvedCampaignBrief,
    );

    const generatedAssetPack = await generateMarketingAssetPackWithCloneMemory({
      campaign: approvedExecutionCampaign,
      digitalCloneProfile: null,
      digitalCloneMemoryContext: null,
      serviceLines: [],
      buyerSegments: [],
      offers: [],
      campaignIntelligenceBrief: null,
      approvedCampaignStrategy,
      verifiedCampaignFacts,
    });
    const approvedSummary = approvedStrategySummary(approvedCampaignStrategy);
    const assetPack = {
      ...generatedAssetPack,
      ...approvedSummary,
    };

    const internalStrategyAssetTypes = new Set([
      "campaign_strategy",
      "audience_angle",
      "core_message",
    ]);
    const assets = marketingAssetPackToAssets(assetPack)
      .filter((asset) => !internalStrategyAssetTypes.has(asset.assetType))
      .map((asset) => ({
        ...asset,
        content: preparePublicAssetContent({
          content: asset.content,
          assetType: asset.assetType,
          title: asset.title,
        }),
      }));
    const memorySnapshot = {
      profileLoaded: Boolean(cloneContext.profile),
      brandRuleCount: cloneContext.brandRules.length,
      contentExampleCount: cloneContext.contentExamples.length,
      knowledgeSourceCount: cloneContext.knowledgeSources.length,
      serviceLineCount: cloneContext.serviceLines.length,
      buyerSegmentCount: cloneContext.buyerSegments.length,
      offerCount: cloneContext.offers.length,
      formattedContextPreview: "Excluded from asset prompt after H1.8B strategy approval.",
      approvedStrategyVersion: strategyGate.version,
      approvedStrategySourceSignature: strategyGate.sourceSignature,
      campaignIntelligence: {
        enabled: campaignIntelligence.enabled,
        readinessScore: campaignIntelligence.brief.readinessScore,
        missingElements: campaignIntelligence.brief.missingElements,
        selectionSummary: campaignIntelligence.selectionSummary,
      },
      strategyEngineV2: {
        version: resolvedCampaignBrief.version,
        promotedOffer: resolvedCampaignBrief.promotedOffer.name,
        offerSource: resolvedCampaignBrief.promotedOffer.source,
        ignoredOffers: resolvedCampaignBrief.promotedOffer.ignoredOfferNames,
      },
      generatedAt: new Date().toISOString(),
    };

    const { data: insertedAssets, error: insertAssetsError } = await supabase
      .from("generated_assets")
      .insert(
        assets.map((asset) => ({
          account_id: accountId,
          user_id: user.id,
          campaign_id: campaign.id,
          asset_type: asset.assetType,
          title: asset.title,
          content: asset.content,
          metadata: toJson({
            generatedBy: "campaign_asset_pack",
            sprint: "5.7",
            oneOffBriefPriorityContract: "h1_6c9",
            contentSpecificityContract: "h1_4g1",
            preReviewEnrichment: process.env.VIP_ENABLE_PRE_REVIEW_ENRICHMENT === "1",
            campaignIntelligenceVersion: "h1_8a",
            campaignIntelligenceEnabled: campaignIntelligence.enabled,
            campaignIntelligenceReadinessScore: campaignIntelligence.brief.readinessScore,
            campaignIntelligenceMissingElements: campaignIntelligence.brief.missingElements,
            campaignIntelligenceSelection: campaignIntelligence.selectionSummary,
            oneOffStrategyApprovalVersion: strategyGate.version,
            oneOffStrategyApprovalStatus: strategyGate.status,
            oneOffStrategyApprovedAt: strategyGate.approvedAt,
            oneOffStrategySourceSignature: strategyGate.sourceSignature,
            approvedCampaignStrategy,
            rawSettingsExcludedFromAssetPrompt: true,
            cloneMemoryUsed: true,
            cloneMemorySnapshot: memorySnapshot,
            oneOffCampaignStrategy,
            companionAssetFlow:
              asset.assetType === "galaxyai_prompt"
                ? "review_prompt_then_send_prompt_only_to_galaxyai"
                : null,
            sourceAssetType: asset.assetType === "galaxyai_prompt" ? "video_script" : null,
            galaxyAiPromptDerivedFromVideoScript: asset.assetType === "galaxyai_prompt",
          }),
          status: "needs_review",
        }))
      )
      .select("*");

    if (insertAssetsError) {
      return NextResponse.json({ error: insertAssetsError.message }, { status: 400 });
    }

    const insertedAssetRows = (insertedAssets ?? []) as InsertedGeneratedAsset[];

    const insertedVideoScript = insertedAssetRows.find(
      (asset) => asset.asset_type === "video_script"
    );
    const insertedGalaxyPrompt = insertedAssetRows.find(
      (asset) => asset.asset_type === "galaxyai_prompt"
    );

    if (insertedVideoScript?.id && insertedGalaxyPrompt?.id) {
      const promptMetadata =
        insertedGalaxyPrompt.metadata &&
        typeof insertedGalaxyPrompt.metadata === "object" &&
        !Array.isArray(insertedGalaxyPrompt.metadata)
          ? insertedGalaxyPrompt.metadata
          : {};

      let promptUpdate = supabase
        .from("generated_assets")
        .update({
          parent_asset_id: insertedVideoScript.id,
          metadata: toJson({
            ...promptMetadata,
            source_video_script_asset_id: insertedVideoScript.id,
            display_with_asset_id: insertedVideoScript.id,
            companion_to_asset_type: "video_script",
            galaxyAiExecutionAsset: true,
            executionRule: "Only the approved galaxyai_prompt asset should be sent to GalaxyAI.",
          }),
        })
        .eq("id", insertedGalaxyPrompt.id);

      promptUpdate = accountId ? promptUpdate.eq("account_id", accountId) : promptUpdate.eq("user_id", user.id);

      await promptUpdate;
    }

    let campaignUpdate = supabase
      .from("campaigns")
      .update({
        status: "asset_pack_generated",
        strategy: toJson({
          ...mergeOneOffStrategyGate(campaign.strategy, strategyGate),
          campaignStrategy: assetPack.campaignStrategy,
          audienceAngle: assetPack.audienceAngle,
          coreMessage: assetPack.coreMessage,
          cloneMemorySnapshot: memorySnapshot,
          oneOffCampaignStrategy,
          campaignIntelligence: {
            version: "h1_8a",
            enabled: campaignIntelligence.enabled,
            brief: campaignIntelligence.brief,
            selectionSummary: campaignIntelligence.selectionSummary,
          },
          h18bExecution: {
            strategyVersion: strategyGate.version,
            strategyApprovedAt: strategyGate.approvedAt,
            strategySourceSignature: strategyGate.sourceSignature,
            rawSettingsExcludedFromAssetPrompt: true,
          },
        }),
      })
      .eq("id", campaign.id);

    campaignUpdate = accountId ? campaignUpdate.eq("account_id", accountId) : campaignUpdate.eq("user_id", user.id);

    const { data: updatedCampaign, error: updateCampaignError } = await campaignUpdate
      .select("*")
      .single();

    if (updateCampaignError) {
      return NextResponse.json({ error: updateCampaignError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "campaign_asset_pack_generated",
      title: "Marketing Asset Pack generated",
      description: `${campaign.name} generated using digital clone memory.`,
      metadata: toJson({
        campaignId: campaign.id,
        accountId,
        assetCount: insertedAssetRows.length,
        cloneMemoryUsed: true,
        memorySnapshot,
        oneOffCampaignStrategy,
        approvedCampaignStrategy,
        strategyApproval: {
          version: strategyGate.version,
          status: strategyGate.status,
          approvedAt: strategyGate.approvedAt,
          sourceSignature: strategyGate.sourceSignature,
          rawSettingsExcludedFromAssetPrompt: true,
        },
        campaignIntelligence: {
          version: "h1_8a",
          enabled: campaignIntelligence.enabled,
          readinessScore: campaignIntelligence.brief.readinessScore,
          missingElements: campaignIntelligence.brief.missingElements,
          selectionSummary: campaignIntelligence.selectionSummary,
        },
      }),
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      assetPack,
      assets: insertedAssetRows,
      cloneMemory: memorySnapshot,
      strategyApproval: {
        version: strategyGate.version,
        status: strategyGate.status,
        approvedAt: strategyGate.approvedAt,
        sourceSignature: strategyGate.sourceSignature,
      },
      campaignIntelligence: {
        version: "h1_8a",
        enabled: campaignIntelligence.enabled,
        readinessScore: campaignIntelligence.brief.readinessScore,
        missingElements: campaignIntelligence.brief.missingElements,
        selectionSummary: campaignIntelligence.selectionSummary,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error generating campaign asset pack." },
      { status: 500 }
    );
  }
}