import { NextResponse } from "next/server";
import {
  buildCalendarAssetPrompt,
  buildCampaignPayloadFromCalendarItem,
  generateCalendarAssetContent,
  isCampaignCalendarItem,
  mapCalendarItemToAssetType,
} from "@/lib/content-calendar/asset-generation";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

async function findWeeklyCampaignForItem({
  supabase,
  userId,
  planId,
  weekNumber,
}: {
  supabase: any;
  userId: string;
  planId: string;
  weekNumber: number;
}) {
  const { data } = await supabase
    .from("content_calendar_items")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .eq("week_number", weekNumber)
    .eq("item_type", "weekly_campaign")
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

async function ensureCampaignForCalendarItem({
  supabase,
  userId,
  item,
  plan,
}: {
  supabase: any;
  userId: string;
  item: Record<string, any>;
  plan: Record<string, any>;
}) {
  if (item.campaign_id) {
    const { data: existingCampaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", item.campaign_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingCampaign) {
      return existingCampaign;
    }
  }

  const campaignPayload = buildCampaignPayloadFromCalendarItem({
    item,
    plan,
    userId,
  });

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert(campaignPayload)
    .select("*")
    .single();

  if (error || !campaign) {
    throw new Error(error?.message ?? "Unable to create campaign from calendar item.");
  }

  await supabase
    .from("content_calendar_items")
    .update({
      campaign_id: campaign.id,
      status: "generated",
      metadata: {
        ...(item.metadata ?? {}),
        generatedCampaignId: campaign.id,
        generatedAt: new Date().toISOString(),
      },
    })
    .eq("id", item.id)
    .eq("user_id", userId);

  await supabase.from("activity_log").insert({
    user_id: userId,
    activity_type: "calendar_campaign_generated",
    title: "Campaign created from content calendar",
    description: campaign.name,
    metadata: {
      planId: item.plan_id,
      itemId: item.id,
      campaignId: campaign.id,
      weekNumber: item.week_number,
    },
  });

  return campaign;
}

export async function POST(_request: Request, context: RouteContext) {
  const { itemId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: item, error: itemError } = await supabase
    .from("content_calendar_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
  }

  const { data: plan, error: planError } = await supabase
    .from("content_calendar_plans")
    .select("*")
    .eq("id", item.plan_id)
    .eq("user_id", user.id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Content calendar plan not found." }, { status: 404 });
  }

  try {
    if (isCampaignCalendarItem(item.item_type)) {
      const campaign = await ensureCampaignForCalendarItem({
        supabase,
        userId: user.id,
        item,
        plan,
      });

      return NextResponse.json({
        ok: true,
        type: "campaign",
        campaign,
      });
    }

    let linkedCampaign = null;

    if (item.campaign_id) {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", item.campaign_id)
        .eq("user_id", user.id)
        .maybeSingle();

      linkedCampaign = data ?? null;
    }

    if (!linkedCampaign) {
      const weeklyCampaignItem = await findWeeklyCampaignForItem({
        supabase,
        userId: user.id,
        planId: item.plan_id,
        weekNumber: Number(item.week_number ?? 1),
      });

      if (weeklyCampaignItem) {
        linkedCampaign = await ensureCampaignForCalendarItem({
          supabase,
          userId: user.id,
          item: weeklyCampaignItem,
          plan,
        });

        await supabase
          .from("content_calendar_items")
          .update({
            campaign_id: linkedCampaign.id,
          })
          .eq("id", item.id)
          .eq("user_id", user.id);
      }
    }

    const prompt = buildCalendarAssetPrompt({
      item,
      plan,
      linkedCampaignName: linkedCampaign?.name ?? null,
    });

    const content = await generateCalendarAssetContent(prompt);
    const assetType = mapCalendarItemToAssetType(item.item_type);

    const { data: asset, error: assetError } = await supabase
      .from("generated_assets")
      .insert({
        user_id: user.id,
        campaign_id: linkedCampaign?.id ?? item.campaign_id ?? null,
        asset_type: assetType,
        title: item.title,
        content,
        status: "needs_review",
        version: 1,
      })
      .select("*")
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { error: assetError?.message ?? "Unable to save generated asset." },
        { status: 400 }
      );
    }

    await supabase
      .from("content_calendar_items")
      .update({
        status: "generated",
        campaign_id: linkedCampaign?.id ?? item.campaign_id ?? null,
        metadata: {
          ...(item.metadata ?? {}),
          generatedAssetId: asset.id,
          generatedAssetType: assetType,
          generatedAt: new Date().toISOString(),
        },
      })
      .eq("id", item.id)
      .eq("user_id", user.id);

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "calendar_asset_generated",
      title: "Asset generated from content calendar",
      description: item.title,
      metadata: {
        planId: item.plan_id,
        itemId: item.id,
        assetId: asset.id,
        assetType,
        campaignId: linkedCampaign?.id ?? item.campaign_id ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      type: "asset",
      asset,
      campaign: linkedCampaign,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected calendar generation error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
