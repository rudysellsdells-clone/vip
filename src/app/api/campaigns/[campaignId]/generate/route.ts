import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/security/auditLog";
import {
  buildMarketingAssetPackSystemPrompt,
  buildMarketingAssetPackUserPrompt,
  formatCampaignStrategyForAsset,
} from "@/lib/ai/prompts";
import { generateMarketingAssetPack } from "@/lib/ai/openai";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const supabase = await createClient();
    const db = supabase as any;

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

    const [{ data: digitalCloneProfile }, { data: serviceLines }, { data: buyerSegments }, { data: offers }, { data: brandRules }, { data: knowledgeSources }] =
      await Promise.all([
        db
          .from("digital_clone_profiles")
          .select("name,purpose,voice_summary,business_summary,audience_summary,offer_summary,sales_outcome_summary")
          .eq("user_id", user.id)
          .eq("active", true)
          .limit(1)
          .maybeSingle(),
        db
          .from("service_lines")
          .select("name,short_name,description,primary_outcome")
          .eq("user_id", user.id)
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .limit(12),
        db
          .from("buyer_segments")
          .select("name,description,common_pains,desired_outcomes,objections")
          .eq("user_id", user.id)
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .limit(12),
        db
          .from("offers")
          .select("name,description,primary_cta,outcome,offer_type")
          .eq("user_id", user.id)
          .eq("active", true)
          .limit(12),
        db
          .from("brand_rules")
          .select("category,rule_text")
          .eq("user_id", user.id)
          .eq("active", true)
          .order("priority", { ascending: true })
          .limit(40),
        db
          .from("knowledge_sources")
          .select("title,summary,content,tags")
          .eq("user_id", user.id)
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    const systemPrompt = buildMarketingAssetPackSystemPrompt();
    const userPrompt = buildMarketingAssetPackUserPrompt({
      campaign,
      digitalCloneProfile,
      serviceLines: serviceLines ?? [],
      buyerSegments: buyerSegments ?? [],
      offers: offers ?? [],
      brandRules: brandRules ?? [],
      knowledgeSources: knowledgeSources ?? [],
    });

    const assetPack = await generateMarketingAssetPack({ systemPrompt, userPrompt });

    const { error: campaignUpdateError } = await supabase
      .from("campaigns")
      .update({
        strategy: assetPack.campaignStrategy,
        status: "asset_pack_generated",
      })
      .eq("id", campaign.id)
      .eq("user_id", user.id);

    if (campaignUpdateError) {
      return NextResponse.json({ error: campaignUpdateError.message }, { status: 400 });
    }

    const strategyAsset = {
      user_id: user.id,
      campaign_id: campaign.id,
      asset_type: "campaign_strategy",
      title: `${campaign.name} Campaign Strategy`,
      content: formatCampaignStrategyForAsset(assetPack.campaignStrategy),
      metadata: {
        approvalChecklist: assetPack.approvalChecklist,
      },
      status: "needs_review" as const,
    };

    const assetRows = assetPack.assets.map((asset) => ({
      user_id: user.id,
      campaign_id: campaign.id,
      asset_type: asset.type,
      title: asset.title,
      content: asset.content,
      metadata: {
        notes: asset.notes,
      },
      status: "needs_review" as const,
    }));

    const { data: assets, error: assetError } = await supabase
      .from("generated_assets")
      .insert([strategyAsset, ...assetRows])
      .select("*");

    if (assetError) {
      return NextResponse.json({ error: assetError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "asset_pack_generated",
      title: "Marketing Asset Pack generated",
      description: `Generated asset pack for ${campaign.name}`,
      metadata: {
        campaignId: campaign.id,
        assetCount: assets?.length ?? 0,
      },
    });

    return NextResponse.json({
      campaignId: campaign.id,
      strategy: assetPack.campaignStrategy,
      assets,
      approvalChecklist: assetPack.approvalChecklist,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error generating the Marketing Asset Pack." },
      { status: 500 }
    );
  }
}
