import { NextResponse } from "next/server";
import { buildMonthlyCampaignPlan } from "@/lib/content-calendar/monthly-campaign-planner";
import { generatePublishReadyWeeklyPackage } from "@/lib/content-generation/publish-ready-weekly-generator";
import { buildBusinessMemoryContext } from "@/lib/content-generation/memory-context";
import { readableError } from "@/lib/errors/readable-error";
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

function textValue(value: unknown) {
  return String(value ?? "").trim();
}

function campaignSummary(week: ReturnType<typeof buildMonthlyCampaignPlan>[number]) {
  return [
    week.campaignAngle,
    "",
    `Campaign week ${week.weekNumber}: ${week.weekStartDate} to ${week.weekEndDate}.`,
    "Includes 1 blog post, 5 LinkedIn posts, 5 Facebook posts, 1 email, and 1 video script.",
  ].join("\n");
}

function campaignIdea(week: ReturnType<typeof buildMonthlyCampaignPlan>[number]) {
  return `${week.campaignName}: ${week.campaignAngle}`.trim();
}

async function createCampaign({
  supabase,
  userId,
  month,
  campaignTheme,
  businessContext,
  memorySources,
  week,
}: {
  supabase: any;
  userId: string;
  month: string;
  campaignTheme: string;
  businessContext: string;
  memorySources: string[];
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number];
}) {
  const idea = campaignIdea(week);

  const campaignPayload = {
    user_id: userId,
    name: week.campaignName,
    idea,
    campaign_month: month,
    campaign_week_number: week.weekNumber,
    campaign_week_start_date: week.weekStartDate,
    campaign_week_end_date: week.weekEndDate,
    planned_start_date: week.weekStartDate,
    planned_end_date: week.weekEndDate,
    metadata: {
      generatedFrom: "monthly_campaign_calendar",
      generationMode: "memory_backed_publish_ready",
      memorySources,
      campaignTheme,
      businessContext,
      campaignName: week.campaignName,
      campaignIdea: idea,
      campaignAngle: week.campaignAngle,
      generationPrompt: week.generationPrompt,
      privateStrategy: week.strategy,
      strategyUsage:
        "Private generation context only. Do not publish raw strategy fields in generated content.",
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

async function handlePost(request: Request) {
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
  const campaignTheme = textValue(body.campaignTheme) || "Authority Growth";
  const businessContext = textValue(body.businessContext);
  const overwriteExisting = Boolean(body.overwriteExisting);
  const requireMemoryContext = Boolean(body.requireMemoryContext);

  const strategy = {
    monthlyObjective: textValue(body.monthlyObjective),
    targetAudience: textValue(body.targetAudience),
    primaryOffer: textValue(body.primaryOffer),
    keyTopics: textValue(body.keyTopics),
    callToAction: textValue(body.callToAction),
    differentiator: textValue(body.differentiator),
    proofPoints: textValue(body.proofPoints),
  };

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

  const memory = await buildBusinessMemoryContext({
    supabase,
    userId: user.id,
    campaignTheme,
    businessContext,
    strategy,
  });

  if (requireMemoryContext && !memory.hasUsefulMemory) {
    return NextResponse.json(
      {
        error:
          "Not enough saved Brand Voice / Knowledge / Business Facts were found to safely generate publish-ready campaign content.",
        hint:
          "Add or confirm Brand Voice and Knowledge records, or rerun without strict memory mode.",
        memorySources: memory.sources,
        memoryWarnings: memory.warnings.slice(0, 8),
      },
      { status: 409 }
    );
  }

  const plan = buildMonthlyCampaignPlan({
    month,
    campaignTheme,
    businessContext,
    strategy,
  });

  const createdCampaigns: Array<Record<string, any>> = [];
  const createdAssets: Array<Record<string, any>> = [];
  const errors: string[] = [];
  const warnings: string[] = [
    ...memory.warnings.slice(0, 8),
    ...(!memory.sources.some((source) => source !== "current_campaign_context")
      ? [
          "No saved Brand Voice / Knowledge / Business Facts were detected. Generation used current campaign context only.",
        ]
      : []),
  ];

  for (const week of plan) {
    let publishReadyAssets: Awaited<ReturnType<typeof generatePublishReadyWeeklyPackage>>;

    try {
      publishReadyAssets = await generatePublishReadyWeeklyPackage({
        month,
        campaignTheme,
        businessContext,
        week,
        memory,
      });
    } catch (error) {
      errors.push(
        `Week ${week.weekNumber}: ${
          error instanceof Error ? error.message : "Unable to generate publish-ready weekly asset package."
        }`
      );
      continue;
    }

    const { data: campaign, error: campaignError } = await createCampaign({
      supabase,
      userId: user.id,
      month,
      campaignTheme,
      businessContext,
      memorySources: memory.sources,
      week,
    });

    if (campaignError || !campaign) {
      errors.push(`Week ${week.weekNumber}: ${campaignError?.message ?? "Unable to create campaign."}`);
      continue;
    }

    createdCampaigns.push(campaign);

    for (let index = 0; index < week.assets.length; index += 1) {
      const plannedAsset = week.assets[index];
      const generatedAsset = publishReadyAssets[index];

      if (!generatedAsset) {
        errors.push(`Week ${week.weekNumber} ${plannedAsset.assetType}: Missing generated asset content.`);
        continue;
      }

      const { data: createdAsset, error: assetError } = await supabase
        .from("generated_assets")
        .insert({
          user_id: user.id,
          campaign_id: campaign.id,
          asset_type: plannedAsset.assetType,
          title: generatedAsset.title || plannedAsset.title,
          content: generatedAsset.content,
          status: "needs_review",
          quality_workflow_status: "not_checked",
          is_active_version: true,
          auto_quality_attempts: 0,
          ...calendarAssetFields({
            month,
            week,
            asset: plannedAsset,
          }),
        })
        .select("*")
        .single();

      if (assetError || !createdAsset) {
        errors.push(
          `Week ${week.weekNumber} ${plannedAsset.assetType}: ${
            assetError?.message ?? "Unable to create generated asset."
          }`
        );
      } else {
        createdAssets.push(createdAsset);
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
      generationMode: "memory_backed_publish_ready",
      campaignTheme,
      businessContext,
      privateStrategy: strategy,
      memorySources: memory.sources,
      memorySourceCount: memory.sourceCount,
      memoryWarnings: memory.warnings.slice(0, 8),
      strictMemoryRequired: requireMemoryContext,
      strategyUsage:
        "Private generation context only. Saved memory is source of truth when available; monthly strategy guides the campaign angle.",
      campaignCount: createdCampaigns.length,
      assetCount: createdAssets.length,
      errors,
      warnings,
      campaignIds: createdCampaigns.map((campaign) => campaign.id),
      assetIds: createdAssets.map((asset) => asset.id),
    },
  });

  const status = createdAssets.length > 0 ? 200 : 400;

  return NextResponse.json(
    {
      ok: createdAssets.length > 0,
      month,
      generationMode: "memory_backed_publish_ready",
      memorySources: memory.sources,
      memorySourceCount: memory.sourceCount,
      campaignCount: createdCampaigns.length,
      assetCount: createdAssets.length,
      errors,
      warnings,
      campaigns: createdCampaigns,
      assets: createdAssets,
      hint:
        createdAssets.length > 0
          ? undefined
          : "No assets were created. Review the errors array for the failed weekly generation reason.",
    },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    return NextResponse.json(
      {
        error: readableError(error, "Unable to generate monthly campaigns."),
        details:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
              }
            : error,
        hint:
          "The generation route crashed before it could finish. Check this response details, Vercel function logs, and environment variables such as OPENAI_API_KEY.",
      },
      { status: 500 }
    );
  }
}
