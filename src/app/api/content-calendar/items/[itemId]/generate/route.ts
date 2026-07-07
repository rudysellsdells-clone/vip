import { NextResponse } from "next/server";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import {
  buildCalendarAssetPrompt,
  buildCampaignPayloadFromCalendarItem,
  generateCalendarAssetContent,
  isCampaignCalendarItem,
  mapCalendarItemToAssetType,
} from "@/lib/content-calendar/asset-generation";
import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";
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
  account_id?: string | null;
};

type CalendarPlanRow = {
  id: string;
  month_label?: string | null;
  monthly_theme?: string | null;
  business_goal?: string | null;
  target_audience?: string | null;
  offer_focus?: string | null;
  account_id?: string | null;
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
    account_id: value.account_id ?? null,
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
    account_id: value.account_id ?? null,
  };
}

async function findWeeklyCampaignForItem({
  supabase,
  userId,
  accountId,
  planId,
  weekNumber,
}: {
  supabase: any;
  userId: string;
  accountId: string;
  planId: string;
  weekNumber: number;
}) {
  const { data } = await supabase
    .from("content_calendar_items")
    .select("*")
    .eq("account_id", accountId)
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
  accountId,
  item,
  plan,
}: {
  supabase: any;
  userId: string;
  accountId: string | null;
  item: CalendarItemRow;
  plan: CalendarPlanRow;
}) {
  if (item.campaign_id) {
    const { data: existingCampaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", item.campaign_id)
      .eq("account_id", accountId)
      .maybeSingle();

    if (existingCampaign) {
      return existingCampaign;
    }
  }

  const campaignPayload = {
    ...buildCampaignPayloadFromCalendarItem({
      item,
      plan,
      userId,
    }),
    account_id: accountId,
  };

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
      account_id: accountId,
      status: "generated",
      metadata: {
        ...(item.metadata ?? {}),
        generatedCampaignId: campaign.id,
        generatedAt: new Date().toISOString(),
      },
    })
    .eq("id", item.id);

  await supabase.from("activity_log").insert({
    user_id: userId,
    account_id: accountId,
    activity_type: "calendar_campaign_generated",
    title: "Campaign created from content calendar",
    description: campaign.name,
    metadata: {
      planId: item.plan_id,
      itemId: item.id,
      campaignId: campaign.id,
      accountId,
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

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;

  if (!activeAccountId) {
    return NextResponse.json({ error: "No active workspace selected." }, { status: 400 });
  }

  if (!accountContext.canManageActiveAccount) {
    return NextResponse.json({ error: "You do not have permission to generate calendar content for this workspace." }, { status: 403 });
  }

  const { data: rawItem, error: itemError } = await supabase
    .from("content_calendar_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (itemError || !rawItem) {
    return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
  }

  const item = asCalendarItemRow(rawItem);
  const itemAccountId = item.account_id ? String(item.account_id) : null;

  if (itemAccountId && itemAccountId !== activeAccountId) {
    return NextResponse.json({ error: "Calendar item belongs to another workspace." }, { status: 403 });
  }

  if (!itemAccountId && !accountContext.isMaster) {
    return NextResponse.json({ error: "Legacy unassigned calendar item cannot be generated by this user." }, { status: 403 });
  }

  const { data: rawPlan, error: planError } = await supabase
    .from("content_calendar_plans")
    .select("*")
    .eq("id", item.plan_id)
    .single();

  if (planError || !rawPlan) {
    return NextResponse.json({ error: "Content calendar plan not found." }, { status: 404 });
  }

  const plan = asCalendarPlanRow(rawPlan);
  const planAccountId = plan.account_id ? String(plan.account_id) : null;

  if (planAccountId && planAccountId !== activeAccountId) {
    return NextResponse.json({ error: "Content calendar plan belongs to another workspace." }, { status: 403 });
  }

  if (!planAccountId && !accountContext.isMaster) {
    return NextResponse.json({ error: "Legacy unassigned calendar plan cannot be generated by this user." }, { status: 403 });
  }

  if (!itemAccountId || !planAccountId) {
    await Promise.all([
      supabase
        .from("content_calendar_items")
        .update({ account_id: activeAccountId })
        .eq("id", item.id),
      supabase
        .from("content_calendar_plans")
        .update({ account_id: activeAccountId })
        .eq("id", plan.id),
    ]);
  }

  try {
    if (isCampaignCalendarItem(item.item_type)) {
      const campaign = await ensureCampaignForCalendarItem({
        supabase,
        userId: user.id,
        accountId: activeAccountId,
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
        .eq("account_id", activeAccountId)
        .maybeSingle();

      linkedCampaign = data ?? null;
    }

    if (!linkedCampaign) {
      const weeklyCampaignItem = await findWeeklyCampaignForItem({
        supabase,
        userId: user.id,
        accountId: activeAccountId,
        planId: item.plan_id,
        weekNumber: Number(item.week_number ?? 1),
      });

      if (weeklyCampaignItem) {
        linkedCampaign = await ensureCampaignForCalendarItem({
          supabase,
          userId: user.id,
          accountId: activeAccountId,
          item: weeklyCampaignItem,
          plan,
        });

        await supabase
          .from("content_calendar_items")
          .update({
            campaign_id: linkedCampaign.id,
            account_id: activeAccountId,
          })
          .eq("id", item.id);
      }
    }

    const prompt = buildCalendarAssetPrompt({
      item,
      plan,
      linkedCampaignName: linkedCampaign?.name ?? null,
    });

    const generatedContent = await generateCalendarAssetContent(prompt);
    const assetType = mapCalendarItemToAssetType(item.item_type);
    const content = preparePublicAssetContent({
      content: generatedContent,
      assetType,
      title: item.title,
    });

    const { data: asset, error: assetError } = await supabase
      .from("generated_assets")
      .insert({
        user_id: user.id,
        account_id: activeAccountId,
        campaign_id: linkedCampaign?.id ?? item.campaign_id ?? null,
        asset_type: assetType,
        title: item.title,
        content,
        status: "needs_review",
        version: 1,
        intended_publish_month: item.scheduled_date ? String(item.scheduled_date).slice(0, 7) : null,
        planned_publish_date: item.scheduled_date ?? null,
        publish_timezone: "America/Chicago",
        scheduling_status: "scheduled",
        campaign_week_number: item.week_number ?? null,
        calendar_notes: item.content_angle ?? null,
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
        account_id: activeAccountId,
        campaign_id: linkedCampaign?.id ?? item.campaign_id ?? null,
        metadata: {
          ...(item.metadata ?? {}),
          generatedAssetId: asset.id,
          accountId: activeAccountId,
          generatedAssetType: assetType,
          generatedAt: new Date().toISOString(),
        },
      })
      .eq("id", item.id);

    await supabase.from("activity_log").insert({
      user_id: user.id,
      account_id: activeAccountId,
      activity_type: "calendar_asset_generated",
      title: "Asset generated from content calendar",
      description: item.title,
      metadata: {
        planId: item.plan_id,
        itemId: item.id,
        assetId: asset.id,
        accountId: activeAccountId,
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