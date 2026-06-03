import { NextResponse } from "next/server";
import { buildMonthlyCampaignPlan } from "@/lib/content-calendar/monthly-campaign-planner";
import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function campaignIdea(week: ReturnType<typeof buildMonthlyCampaignPlan>[number]) {
  return `${week.campaignName}: ${week.campaignAngle}`.trim();
}

function campaignSummary(week: ReturnType<typeof buildMonthlyCampaignPlan>[number]) {
  return [
    week.campaignAngle,
    "",
    `Campaign week ${week.weekNumber}: ${week.weekStartDate} to ${week.weekEndDate}.`,
    "Includes 1 blog post, 5 LinkedIn posts, 5 Facebook posts, 1 email, 1 video script, and 1 GalaxyAI prompt.",
  ].join("\n");
}

function campaignPayload({
  userId,
  month,
  campaignTheme,
  businessContext,
  week,
}: {
  userId: string;
  month: string;
  campaignTheme: string;
  businessContext: string;
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number];
}) {
  const idea = campaignIdea(week);

  return {
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
      generationMode: "fast_batch_stable_planner",
      campaignTheme,
      businessContext,
      campaignName: week.campaignName,
      campaignIdea: idea,
      campaignAngle: week.campaignAngle,
      publicTopic: week.publicTopic ?? null,
      publicTitle: week.publicTitle ?? null,
      generationPrompt: week.generationPrompt ?? null,
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
        galaxyai_prompt: 1,
      },
    },
  };
}

function assetPayload({
  userId,
  campaignId,
  month,
  week,
  asset,
}: {
  userId: string;
  campaignId: string;
  month: string;
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number];
  asset: ReturnType<typeof buildMonthlyCampaignPlan>[number]["assets"][number];
}) {
  return {
    user_id: userId,
    campaign_id: campaignId,
    asset_type: asset.assetType,
    title: asset.title,
    content: preparePublicAssetContent({
      content: asset.content,
      assetType: asset.assetType,
      title: asset.title,
    }),
    metadata: toJson({
      generatedBy: "monthly_campaign_calendar",
      generationMode: "fast_batch_stable_planner",
      companionAssetFlow:
        asset.assetType === "galaxyai_prompt"
          ? "review_prompt_then_send_prompt_only_to_galaxyai"
          : null,
      sourceAssetType: asset.assetType === "galaxyai_prompt" ? "video_script" : null,
      galaxyAiPromptDerivedFromVideoScript: asset.assetType === "galaxyai_prompt",
    }),
    status: "needs_review",

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

    quality_workflow_status: "not_checked",
    auto_quality_attempts: 0,
    is_active_version: true,
  };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
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
    const { count, error: countError } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("campaign_month", month)
      .is("archived_at", null);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 });
    }

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
    strategy,
  });

  if (!plan.length) {
    return NextResponse.json(
      {
        error: "No campaign weeks were created for this month.",
        month,
      },
      { status: 400 }
    );
  }

  /*
    Important:
    This route intentionally does NOT call OpenAI and does NOT read memory.
    It must finish quickly and reliably. Content improvement happens later through
    Bulk Quality Review / resubmission, not inside the monthly creation transaction.
  */
  const campaignRows = plan.map((week) =>
    campaignPayload({
      userId: user.id,
      month,
      campaignTheme,
      businessContext,
      week,
    })
  );

  const { data: createdCampaigns, error: campaignInsertError } = await supabase
    .from("campaigns")
    .insert(campaignRows)
    .select("*");

  if (campaignInsertError || !Array.isArray(createdCampaigns)) {
    return NextResponse.json(
      {
        error: campaignInsertError?.message ?? "Unable to create monthly campaigns.",
        stage: "campaign_batch_insert",
      },
      { status: 400 }
    );
  }

  const campaignByWeek = new Map<number, Record<string, any>>();

  for (const campaign of createdCampaigns) {
    campaignByWeek.set(Number(campaign.campaign_week_number), campaign);
  }

  const assetRows = plan.flatMap((week) => {
    const campaign = campaignByWeek.get(Number(week.weekNumber));

    if (!campaign?.id) return [];

    return week.assets.map((asset) =>
      assetPayload({
        userId: user.id,
        campaignId: campaign.id,
        month,
        week,
        asset,
      })
    );
  });

  if (!assetRows.length) {
    return NextResponse.json(
      {
        error: "Campaigns were created, but no asset rows were prepared.",
        stage: "asset_prepare",
        campaignCount: createdCampaigns.length,
      },
      { status: 400 }
    );
  }

  const { data: createdAssets, error: assetInsertError } = await supabase
    .from("generated_assets")
    .insert(assetRows)
    .select("*");

  if (assetInsertError || !Array.isArray(createdAssets)) {
    return NextResponse.json(
      {
        error: assetInsertError?.message ?? "Unable to create generated assets.",
        stage: "asset_batch_insert",
        campaignCount: createdCampaigns.length,
        attemptedAssetCount: assetRows.length,
      },
      { status: 400 }
    );
  }

  const linkWarnings: string[] = [];

  for (const promptAsset of createdAssets.filter(
    (asset) => asset.asset_type === "galaxyai_prompt"
  )) {
    const companionVideoScript = createdAssets.find(
      (asset) =>
        asset.asset_type === "video_script" &&
        asset.campaign_id === promptAsset.campaign_id &&
        Number(asset.campaign_week_number) === Number(promptAsset.campaign_week_number)
    );

    if (!companionVideoScript?.id) {
      linkWarnings.push(
        `GalaxyAI prompt ${promptAsset.id} was created, but no matching Friday video script was found for parent linking.`
      );
      continue;
    }

    const metadata =
      promptAsset.metadata && typeof promptAsset.metadata === "object" && !Array.isArray(promptAsset.metadata)
        ? promptAsset.metadata
        : {};

    const { error: linkError } = await supabase
      .from("generated_assets")
      .update({
        parent_asset_id: companionVideoScript.id,
        metadata: toJson({
          ...metadata,
          source_video_script_asset_id: companionVideoScript.id,
          display_with_asset_id: companionVideoScript.id,
          companion_to_asset_type: "video_script",
          galaxyAiExecutionAsset: true,
          executionRule: "Only the approved galaxyai_prompt asset should be sent to GalaxyAI.",
        }),
      })
      .eq("id", promptAsset.id)
      .eq("user_id", user.id);

    if (linkError) {
      linkWarnings.push(
        `Unable to link GalaxyAI prompt ${promptAsset.id} to video script ${companionVideoScript.id}: ${linkError.message}`
      );
    }
  }

  const warnings = [
    "Fast batch generation mode is active. The route does not call OpenAI or memory, which prevents Vercel function timeouts during monthly package creation.",
    ...linkWarnings,
  ];

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "monthly_campaign_package_generated",
    title: "Monthly campaign package generated",
    description: `${createdCampaigns.length} campaign(s) and ${createdAssets.length} generated asset(s) created for ${month}.`,
    metadata: {
      month,
      generationMode: "fast_batch_stable_planner",
      campaignTheme,
      businessContext,
      privateStrategy: strategy,
      campaignCount: createdCampaigns.length,
      assetCount: createdAssets.length,
      warnings,
      durationMs: Date.now() - startedAt,
      campaignIds: createdCampaigns.map((campaign) => campaign.id),
      assetIds: createdAssets.map((asset) => asset.id),
    },
  });

  return NextResponse.json({
    ok: true,
    month,
    generationMode: "fast_batch_stable_planner",
    campaignCount: createdCampaigns.length,
    assetCount: createdAssets.length,
    expectedAssetCount: assetRows.length,
    durationMs: Date.now() - startedAt,
    errors: [],
    warnings,
    campaigns: createdCampaigns,
    assets: createdAssets,
  });
}
