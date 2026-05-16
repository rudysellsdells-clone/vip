import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
}) {
  return {
    name: campaign.name,
    idea: campaign.idea,
    buyer_segment: campaign.buyer_segment,
    audience: campaign.audience,
    goal: campaign.goal,
    platforms: campaign.platforms ?? [],
    tone: campaign.tone,
    cta: campaign.cta,
    notes: campaign.notes,
  };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const supabase = await createClient();

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
      .eq("user_id", user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const cloneContext = await loadDigitalCloneContext(user.id);

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
          user_id: user.id,
          campaign_id: campaign.id,
          asset_type: asset.assetType,
          title: asset.title,
          content: asset.content,
          metadata: toJson({
            generatedBy: "campaign_asset_pack",
            sprint: "5.7",
            cloneMemoryUsed: true,
            cloneMemorySnapshot: memorySnapshot,
          }),
          status: "needs_review",
        }))
      )
      .select("*");

    if (insertAssetsError) {
      return NextResponse.json({ error: insertAssetsError.message }, { status: 400 });
    }

    const { data: updatedCampaign, error: updateCampaignError } = await supabase
      .from("campaigns")
      .update({
        status: "asset_pack_generated",
        strategy: toJson({
          campaignStrategy: assetPack.campaignStrategy,
          audienceAngle: assetPack.audienceAngle,
          coreMessage: assetPack.coreMessage,
          cloneMemorySnapshot: memorySnapshot,
        }),
      })
      .eq("id", campaign.id)
      .eq("user_id", user.id)
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
        assetCount: insertedAssets?.length ?? 0,
        cloneMemoryUsed: true,
        memorySnapshot,
      }),
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      assetPack,
      assets: insertedAssets ?? [],
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
