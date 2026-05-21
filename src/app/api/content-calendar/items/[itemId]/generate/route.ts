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

type CalendarItemRow = {
  id: string;
  title: string;
  description?: string | null;
  item_type: string;
  platform?: string | null;
  content_angle?: string | null;
  cta?: string | null;
  week_number?: number | null;
  scheduled_date?: string | null;
  metadata?: Record<string, unknown> | null;
  plan_id: string;
  campaign_id?: string | null;
};

type CalendarPlanRow = {
  id: string;
  month_label?: string | null;
  monthly_theme?: string | null;
  business_goal?: string | null;
  target_audience?: string | null;
  offer_focus?: string | null;
};

function asCalendarItemRow(value: Record<string, any>): CalendarItemRow {
  return {
    id: String(value.id),
    title: String(value.title ?? "Untitled calendar item"),
    description: value.description ?? null,
    item_type: String(value.item_type ?? "other"),
    platform: value.platform ?? null,
    content_angle: value.content_angle ?? null,
    cta: value.cta ?? null,
    week_number: Number(value.week_number ?? 1),
    scheduled_date: value.scheduled_date ?? null,
    metadata:
      value.metadata && typeof value.metadata === "object"
        ? value.metadata
        : {},
    plan_id: String(value.plan_id),
    campaign_id: value.campaign_id ?? null,
  };
}

function asCalendarPlanRow(value: Record<string, any>): CalendarPlanRow {
  return {
    id: String(value.id),
    month_label: value.month_label ?? null,
    monthly_theme: value.monthly_theme ?? null,
    business_goal: value.business_goal ?? null,
    target_audience: value.target_audience ?? null,
    offer_focus: value.offer_focus ?? null,
  };
}

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

  return data ? asCalendarItemRow(data) : null;
}

async function ensureCampaignForCalendarItem({
  supabase,
  userId,
  item,
  plan,
}: {
  supabase: any;
  userId: string;
  item: CalendarItemRow;
  plan: CalendarPlanRow;
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

  const { data: rawItem, error: itemError } = await supabase
    .from("content_calendar_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (itemError || !rawItem) {
    return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
  }

  const item = asCalendarItemRow(rawItem);

  const { data: rawPlan, error: planError } = await supabase
    .from("content_calendar_plans")
    .select("*")
    .eq("id", item.plan_id)
    .eq("user_id", user.id)
    .single();

  if (planError || !rawPlan) {
    return NextResponse.json({ error: "Content calendar plan not found." }, { status: 404 });
  }

  const plan = asCalendarPlanRow(rawPlan);

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
