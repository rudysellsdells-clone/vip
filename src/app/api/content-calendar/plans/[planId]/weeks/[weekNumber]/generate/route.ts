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
    planId: string;
    weekNumber: string;
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
  status?: string | null;
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
    status: value.status ?? null,
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

function itemAlreadyGenerated(item: CalendarItemRow) {
  return Boolean(item.metadata?.generatedAssetId || item.metadata?.generatedCampaignId);
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

async function generateAssetForItem({
  supabase,
  userId,
  item,
  plan,
  campaign,
}: {
  supabase: any;
  userId: string;
  item: CalendarItemRow;
  plan: CalendarPlanRow;
  campaign: Record<string, any> | null;
}) {
  const prompt = buildCalendarAssetPrompt({
    item,
    plan,
    linkedCampaignName: campaign?.name ?? null,
  });

  const content = await generateCalendarAssetContent(prompt);
  const assetType = mapCalendarItemToAssetType(item.item_type);

  const { data: asset, error: assetError } = await supabase
    .from("generated_assets")
    .insert({
      user_id: userId,
      campaign_id: campaign?.id ?? item.campaign_id ?? null,
      asset_type: assetType,
      title: item.title,
      content,
      status: "needs_review",
      version: 1,
    })
    .select("*")
    .single();

  if (assetError || !asset) {
    throw new Error(assetError?.message ?? "Unable to save generated asset.");
  }

  await supabase
    .from("content_calendar_items")
    .update({
      status: "generated",
      campaign_id: campaign?.id ?? item.campaign_id ?? null,
      metadata: {
        ...(item.metadata ?? {}),
        generatedAssetId: asset.id,
        generatedAssetType: assetType,
        generatedAt: new Date().toISOString(),
      },
    })
    .eq("id", item.id)
    .eq("user_id", userId);

  await supabase.from("activity_log").insert({
    user_id: userId,
    activity_type: "calendar_asset_generated",
    title: "Asset generated from content calendar",
    description: item.title,
    metadata: {
      planId: item.plan_id,
      itemId: item.id,
      assetId: asset.id,
      assetType,
      campaignId: campaign?.id ?? item.campaign_id ?? null,
      weekNumber: item.week_number,
    },
  });

  return asset;
}

export async function POST(_request: Request, context: RouteContext) {
  const { planId, weekNumber } = await context.params;
  const week = Number(weekNumber);
  const supabase = untypedSupabase(await createClient());

  if (!Number.isInteger(week) || week < 1 || week > 6) {
    return NextResponse.json({ error: "Invalid week number." }, { status: 400 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rawPlan, error: planError } = await supabase
    .from("content_calendar_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (planError || !rawPlan) {
    return NextResponse.json({ error: "Content calendar plan not found." }, { status: 404 });
  }

  const plan = asCalendarPlanRow(rawPlan);

  const { data: rawItems, error: itemsError } = await supabase
    .from("content_calendar_items")
    .select("*")
    .eq("plan_id", planId)
    .eq("user_id", user.id)
    .eq("week_number", week)
    .order("scheduled_date", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  const items = ((rawItems ?? []) as Array<Record<string, any>>).map(asCalendarItemRow);

  if (items.length === 0) {
    return NextResponse.json({ error: "No calendar items found for this week." }, { status: 404 });
  }

  const weeklyCampaignItem = items.find((item) => isCampaignCalendarItem(item.item_type));

  if (!weeklyCampaignItem) {
    return NextResponse.json(
      { error: "This week does not have a weekly campaign item." },
      { status: 400 }
    );
  }

  const errors: Array<{ itemId: string; title: string; error: string }> = [];
  const generatedAssets: Array<Record<string, any>> = [];
  let campaign: Record<string, any> | null = null;
  let skippedCount = 0;

  try {
    campaign = await ensureCampaignForCalendarItem({
      supabase,
      userId: user.id,
      item: weeklyCampaignItem,
      plan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create weekly campaign.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  for (const item of items) {
    if (isCampaignCalendarItem(item.item_type)) {
      continue;
    }

    if (itemAlreadyGenerated(item)) {
      skippedCount += 1;
      continue;
    }

    try {
      const asset = await generateAssetForItem({
        supabase,
        userId: user.id,
        item,
        plan,
        campaign,
      });

      generatedAssets.push(asset);
    } catch (error) {
      errors.push({
        itemId: item.id,
        title: item.title,
        error: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "calendar_week_package_generated",
    title: "Calendar week package generated",
    description: `${plan.month_label ?? "Content plan"} - Week ${week}`,
    metadata: {
      planId,
      weekNumber: week,
      campaignId: campaign?.id ?? null,
      generatedAssetCount: generatedAssets.length,
      skippedCount,
      errorCount: errors.length,
      errors,
    },
  });

  return NextResponse.json({
    ok: errors.length === 0,
    campaign,
    generatedAssets,
    generatedAssetCount: generatedAssets.length,
    skippedCount,
    errors,
  });
}
