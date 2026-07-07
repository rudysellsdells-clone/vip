import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";
import { loadDigitalCloneContext } from "@/lib/clone/context";
import { generateMarketingAssetPackWithCloneMemory } from "@/lib/ai/asset-pack-generator";
import { marketingAssetPackToAssets } from "@/lib/ai/asset-pack-types";
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

function normalizeCampaignForPrompt(campaign: {
  name: string;
  idea: string;
  buyer_segment: string | null;
  audience: string | null;
  goal: string | null;
  platforms: string[] | null;
  tone: string | null;
  cta: string | null;
  notes: string | null;
  strategy?: unknown;
}) {
  const strategyNotes =
    campaign.strategy &&
    typeof campaign.strategy === "object" &&
    !Array.isArray(campaign.strategy)
      ? `One-off campaign strategy context:\n${JSON.stringify(campaign.strategy, null, 2)}`
      : "";

  return {
    name: campaign.name,
    idea: campaign.idea,
    buyer_segment: campaign.buyer_segment,
    audience: campaign.audience,
    goal: campaign.goal,
    platforms: campaign.platforms ?? [],
    tone: campaign.tone,
    cta: campaign.cta,
    notes: [campaign.notes, strategyNotes].filter(Boolean).join("\n\n"),
  };
}

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

    const cloneContext = await loadDigitalCloneContext(user.id, accountId);

    const oneOffCampaignStrategy =
      campaign.strategy && typeof campaign.strategy === "object" && !Array.isArray(campaign.strategy)
        ? (campaign.strategy as Record<string, unknown>)
        : null;

    const assetPack = await generateMarketingAssetPackWithCloneMemory({
      campaign: normalizeCampaignForPrompt(campaign),
      digitalCloneProfile:
        cloneContext.profile && typeof cloneContext.profile === "object"
          ? (cloneContext.profile as Record<string, unknown>)
          : null,
      digitalCloneMemoryContext: cloneContext.formattedContext,
      serviceLines: cloneContext.serviceLines as Record<string, unknown>[],
      buyerSegments: cloneContext.buyerSegments as Record<string, unknown>[],
      offers: cloneContext.offers as Record<string, unknown>[],
    });

    const assets = marketingAssetPackToAssets(assetPack);
    const memorySnapshot = {
      profileLoaded: Boolean(cloneContext.profile),
      brandRuleCount: cloneContext.brandRules.length,
      contentExampleCount: cloneContext.contentExamples.length,
      knowledgeSourceCount: cloneContext.knowledgeSources.length,
      serviceLineCount: cloneContext.serviceLines.length,
      buyerSegmentCount: cloneContext.buyerSegments.length,
      offerCount: cloneContext.offers.length,
      formattedContextPreview: cloneContext.formattedContext.slice(0, 2000),
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
            contentSpecificityContract: "h1_4g1",
            preReviewEnrichment: true,
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
          campaignStrategy: assetPack.campaignStrategy,
          audienceAngle: assetPack.audienceAngle,
          coreMessage: assetPack.coreMessage,
          cloneMemorySnapshot: memorySnapshot,
          oneOffCampaignStrategy,
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
      }),
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      assetPack,
      assets: insertedAssetRows,
      cloneMemory: memorySnapshot,
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