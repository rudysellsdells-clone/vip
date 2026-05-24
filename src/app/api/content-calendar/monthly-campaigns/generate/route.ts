import { NextResponse } from "next/server";
import { buildMonthlyCampaignPlan } from "@/lib/content-calendar/monthly-campaign-planner";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function normalizeMonth(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(text)) {
    return text;
  }

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function campaignSummary(week: ReturnType<typeof buildMonthlyCampaignPlan>[number]) {
  return [
    week.campaignAngle,
    "",
    `Campaign week ${week.weekNumber}: ${week.weekStartDate} to ${week.weekEndDate}.`,
    "Includes 1 blog post, 5 LinkedIn posts, 5 Facebook posts, 1 email, and 1 video script.",
  ].join("\n");
}

async function createCampaign({
  supabase,
  userId,
  month,
  campaignTheme,
  businessContext,
  week,
}: {
  supabase: any;
  userId: string;
  month: string;
  campaignTheme: string;
  businessContext: string;
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number];
}) {
  const campaignPayload = {
    user_id: userId,
    name: week.campaignName,
    campaign_month: month,
    campaign_week_number: week.weekNumber,
    campaign_week_start_date: week.weekStartDate,
    campaign_week_end_date: week.weekEndDate,
    planned_start_date: week.weekStartDate,
    planned_end_date: week.weekEndDate,
    metadata: {
      generatedFrom: "monthly_campaign_calendar",
      campaignTheme,
      businessContext,
      campaignName: week.campaignName,
      campaignAngle: week.campaignAngle,
      campaignSummary: campaignSummary(week),
      weeklyAssetPackage: {
        blog_post: 1,
        linkedin_post: 5,
        facebook_post: 5,
        email: 1,
        video_script: 1,
      },
    },
  };

  return supabase
    .from("campaigns")
    .insert(campaignPayload)
    .select("*")
    .single();
}

function minimalAssetPayload({
  userId,
  campaignId,
  asset,
}: {
  userId: string;
  campaignId: string;
  asset: ReturnType<typeof buildMonthlyCampaignPlan>[number]["assets"][number];
}) {
  return {
    user_id: userId,
    campaign_id: campaignId,
    asset_type: asset.assetType,
    title: asset.title,
    content: asset.content,
    status: "needs_review",
  };
}

function calendarAssetFields({
  month,
  week,
  asset,
}: {
  month: string;
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number];
  asset: ReturnType<typeof buildMonthlyCampaignPlan>[number]["assets"][number];
}) {
  return {
    intended_publish_month: month,
    planned_publish_date: asset.plannedPublishDate,
    scheduled_publish_at: asset.scheduledPublishAt,
    publish_timezone: "America/Chicago",
    scheduling_status: "scheduled",
    scheduling_notes: asset.calendarNotes,
    campaign_week_number: week.weekNumber,
    campaign_week_start_date: week.weekStartDate,
    calendar_sort_order: asset.sortOrder,
    calendar_notes: asset.calendarNotes,
  };
}

async function createGeneratedAsset({
  supabase,
  userId,
  campaignId,
  month,
  week,
  asset,
}: {
  supabase: any;
  userId: string;
  campaignId: string;
  month: string;
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number];
  asset: ReturnType<typeof buildMonthlyCampaignPlan>[number]["assets"][number];
}) {
  const fullPayload = {
    ...minimalAssetPayload({ userId, campaignId, asset }),
    ...calendarAssetFields({ month, week, asset }),
  };

  const fullResult = await supabase
    .from("generated_assets")
    .insert(fullPayload)
    .select("*")
    .single();

  if (!fullResult.error && fullResult.data) {
    return {
      data: fullResult.data,
      error: null,
      warning: null,
    };
  }

  /*
    Fallback: if PostgREST schema cache complains about one of the newer calendar columns,
    still create the real generated asset instead of losing the asset entirely.
    The asset may appear under Unplaced Records until the SQL/schema cache refresh is applied.
  */
  const minimalResult = await supabase
    .from("generated_assets")
    .insert(minimalAssetPayload({ userId, campaignId, asset }))
    .select("*")
    .single();

  if (minimalResult.error || !minimalResult.data) {
    return {
      data: null,
      error: minimalResult.error ?? fullResult.error,
      warning: fullResult.error?.message ?? null,
    };
  }

  const updateResult = await supabase
    .from("generated_assets")
    .update(calendarAssetFields({ month, week, asset }))
    .eq("id", minimalResult.data.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (!updateResult.error && updateResult.data) {
    return {
      data: updateResult.data,
      error: null,
      warning: fullResult.error?.message ?? null,
    };
  }

  return {
    data: minimalResult.data,
    error: null,
    warning:
      updateResult.error?.message ??
      fullResult.error?.message ??
      "Generated asset was created, but calendar fields were not applied.",
  };
}

export async function POST(request: Request) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const month = normalizeMonth(body.month);
  const campaignTheme = String(body.campaignTheme ?? "Authority Growth").trim();
  const businessContext = String(body.businessContext ?? "").trim();
  const overwriteExisting = Boolean(body.overwriteExisting);

  if (!overwriteExisting) {
    const { count } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("campaign_month", month)
      .is("archived_at", null);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Campaigns already exist for this month. Enable overwrite if you intentionally want to create another set.",
          existingCount: count,
        },
        { status: 409 }
      );
    }
  }

  const plan = buildMonthlyCampaignPlan({
    month,
    campaignTheme,
    businessContext,
  });

  const createdCampaigns: Array<Record<string, any>> = [];
  const createdAssets: Array<Record<string, any>> = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const week of plan) {
    const { data: campaign, error: campaignError } = await createCampaign({
      supabase,
      userId: user.id,
      month,
      campaignTheme,
      businessContext,
      week,
    });

    if (campaignError || !campaign) {
      errors.push(`Week ${week.weekNumber}: ${campaignError?.message ?? "Unable to create campaign."}`);
      continue;
    }

    createdCampaigns.push(campaign);

    for (const asset of week.assets) {
      const result = await createGeneratedAsset({
        supabase,
        userId: user.id,
        campaignId: campaign.id,
        month,
        week,
        asset,
      });

      if (result.error || !result.data) {
        errors.push(
          `Week ${week.weekNumber} ${asset.assetType}: ${
            result.error?.message ?? "Unable to create generated asset."
          }`
        );
      } else {
        createdAssets.push(result.data);

        if (result.warning) {
          warnings.push(`Week ${week.weekNumber} ${asset.assetType}: ${result.warning}`);
        }
      }
    }
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "monthly_campaign_package_generated",
    title: "Monthly campaign package generated",
    description: `${createdCampaigns.length} campaign(s) and ${createdAssets.length} generated asset(s) created for ${month}.`,
    metadata: {
      month,
      campaignTheme,
      businessContext,
      campaignCount: createdCampaigns.length,
      assetCount: createdAssets.length,
      errors,
      warnings,
      campaignIds: createdCampaigns.map((campaign) => campaign.id),
      assetIds: createdAssets.map((asset) => asset.id),
    },
  });

  return NextResponse.json({
    ok: true,
    month,
    campaignCount: createdCampaigns.length,
    assetCount: createdAssets.length,
    errors,
    warnings,
    campaigns: createdCampaigns,
    assets: createdAssets,
  });
}
