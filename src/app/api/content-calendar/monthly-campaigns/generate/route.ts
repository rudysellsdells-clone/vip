import { NextResponse } from "next/server";
import { buildMonthlyCampaignPlan } from "@/lib/content-calendar/monthly-campaign-planner";
import {
  buildMarketingSpine,
  marketingSpineSummary,
} from "@/lib/content-calendar/marketing-spine";
import {
  canManageAccountRole,
  getUserAccountContext,
} from "@/lib/accounts/account-context";
import {
  fetchAccountMarketProfile,
  marketProfileSummary,
  mergeStrategyWithMarketDefaults,
  resolveAccountMarketProfile,
} from "@/lib/accounts/account-market-profile";
import { buildBusinessMemoryContext } from "@/lib/content-generation/memory-context";
import { generatePublishReadyWeeklyPackage } from "@/lib/content-generation/publish-ready-weekly-generator";
import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import type { Json } from "@/types/database.types";

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

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function campaignIdea(
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number],
) {
  return `${week.campaignName}: ${week.campaignAngle}`.trim();
}

function campaignSummary(
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number],
) {
  return [
    week.campaignAngle,
    "",
    `Campaign week ${week.weekNumber}: ${week.weekStartDate} to ${week.weekEndDate}.`,
    "Includes 1 blog post, 5 LinkedIn posts, 5 Facebook posts, 1 email, 1 video script, 1 GalaxyAI video prompt, 1 weekly visual direction, and 10 GalaxyAI social image prompts.",
  ].join("\n");
}

const AI_PUBLIC_COPY_ASSET_TYPES = [
  "blog_post",
  "linkedin_post",
  "facebook_post",
  "email",
  "video_script",
];

function slotIdForAsset(assetType: string, index: number) {
  return `${assetType}_${index + 1}`;
}

async function upgradePlanWithAiPublicCopy({
  supabase,
  userId,
  accountId,
  month,
  campaignTheme,
  businessContext,
  strategy,
  plan,
}: {
  supabase: any;
  userId: string;
  accountId: string;
  month: string;
  campaignTheme: string;
  businessContext: string;
  strategy: Record<string, unknown>;
  plan: ReturnType<typeof buildMonthlyCampaignPlan>;
}) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      plan,
      generationMode: "human_safe_fast_draft",
      warnings: [
        "OPENAI_API_KEY is not configured, so monthly generation used the human-safe fast draft templates.",
      ],
    };
  }

  try {
    const memory = await buildBusinessMemoryContext({
      supabase,
      userId,
      accountId,
      campaignTheme,
      businessContext,
      strategy: strategy as Record<string, string>,
    });

    const upgradedWeeks: ReturnType<typeof buildMonthlyCampaignPlan> = [];

    for (const week of plan) {
      const generatedAssets = await generatePublishReadyWeeklyPackage({
        month,
        campaignTheme,
        businessContext,
        week,
        memory,
        assetTypes: AI_PUBLIC_COPY_ASSET_TYPES,
      });

      const generatedBySlotId = new Map(
        generatedAssets.map((asset) => [asset.slotId, asset]),
      );

      upgradedWeeks.push({
        ...week,
        assets: week.assets.map((asset, index) => {
          const generated = generatedBySlotId.get(slotIdForAsset(asset.assetType, index));

          if (!generated) return asset;

          return {
            ...asset,
            title: generated.title || asset.title,
            content: generated.content || asset.content,
            metadata: {
              ...(asset.metadata ?? {}),
              aiHumanizedPublicCopy: true,
              aiHumanizedAt: new Date().toISOString(),
              fastDraftRetainedForNonPublicAssets: true,
            },
          };
        }),
      });
    }

    return {
      plan: upgradedWeeks,
      generationMode: "ai_humanized_public_copy",
      warnings: [
        memory.hasUsefulMemory
          ? `AI public-copy generation used ${memory.sourceCount} saved memory source group(s).`
          : "AI public-copy generation ran with campaign context only because no saved memory was found.",
        ...memory.warnings.map((warning) => `Memory warning: ${warning}`),
      ],
    };
  } catch (error) {
    return {
      plan,
      generationMode: "human_safe_fast_draft",
      warnings: [
        `AI public-copy generation could not complete, so monthly generation used the human-safe fast draft templates: ${error instanceof Error ? error.message : "Unknown error."}`,
      ],
    };
  }
}

function campaignPayload({
  userId,
  accountId,
  month,
  campaignTheme,
  businessContext,
  marketProfile,
  week,
  generationMode,
}: {
  userId: string;
  accountId: string | null;
  month: string;
  campaignTheme: string;
  businessContext: string;
  marketProfile: Record<string, unknown>;
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number];
  generationMode: string;
}) {
  const idea = campaignIdea(week);

  return {
    user_id: userId,
    account_id: accountId,
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
      generationMode,
      campaignTheme,
      businessContext,
      accountId,
      marketProfile,
      marketingSpine: week.marketingSpine
        ? marketingSpineSummary(week.marketingSpine)
        : null,
      marketingSpineUsage:
        "Marketing Spine is the strategy chain of custody for this campaign: brand to strategy to channel roles to asset briefs to quality review to publishing.",
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
        campaign_visual_direction: 1,
        galaxyai_image_prompt: 10,
      },
    },
  };
}

function assetPayload({
  userId,
  accountId,
  campaignId,
  month,
  week,
  asset,
  marketProfile,
  generationMode,
}: {
  userId: string;
  accountId: string | null;
  campaignId: string;
  month: string;
  week: ReturnType<typeof buildMonthlyCampaignPlan>[number];
  asset: ReturnType<typeof buildMonthlyCampaignPlan>[number]["assets"][number];
  marketProfile: Record<string, unknown>;
  generationMode: string;
}) {
  return {
    user_id: userId,
    account_id: accountId,
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
      generationMode,
      accountId,
      marketProfile,
      companionAssetFlow:
        asset.assetType === "galaxyai_prompt"
          ? "review_prompt_then_send_prompt_only_to_galaxyai"
          : null,
      sourceAssetType:
        asset.assetType === "galaxyai_prompt" ? "video_script" : null,
      galaxyAiPromptDerivedFromVideoScript:
        asset.assetType === "galaxyai_prompt",
      ...(asset.metadata ?? {}),
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
  const enteredBusinessContext = textValue(body.businessContext);
  const overwriteExisting = Boolean(body.overwriteExisting);
  const marketingSpineReviewed = Boolean(body.marketingSpineReviewed);

  const accountContext = await getUserAccountContext({
    supabase,
    userId: user.id,
  });
  const requestedAccountId = textValue(body.accountId);
  const activeAccount =
    accountContext.accounts.find(
      (account) => account.id === requestedAccountId,
    ) ??
    accountContext.accounts.find(
      (account) => account.id === accountContext.activeAccountId,
    ) ??
    null;
  const activeAccountId = activeAccount?.id ?? null;

  if (!activeAccountId) {
    return NextResponse.json(
      { error: "No active workspace selected." },
      { status: 400 },
    );
  }

  if (!(accountContext.isMaster || canManageAccountRole(activeAccount?.role))) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to generate monthly campaigns for this workspace.",
      },
      { status: 403 },
    );
  }

  const marketProfileOptions = await fetchAccountMarketProfile({
    supabase,
    accountId: activeAccountId,
  });

  const resolvedMarketProfile = resolveAccountMarketProfile({
    profile: marketProfileOptions,
    selection: {
      serviceLineId: textValue(body.serviceLineId),
      audienceId: textValue(body.audienceId),
      offerId: textValue(body.offerId),
    },
  });

  const enteredStrategy = {
    monthlyObjective: textValue(body.monthlyObjective),
    targetAudience: textValue(body.targetAudience),
    primaryOffer: textValue(body.primaryOffer),
    keyTopics: textValue(body.keyTopics),
    tone: textValue(body.brandTone) || textValue(body.tone),
    callToAction: textValue(body.callToAction),
    differentiator: textValue(body.differentiator),
    proofPoints: textValue(body.proofPoints),
    originalityAngle: textValue(body.originalityAngle),
    objections: textValue(body.objections),
  };

  const strategy = mergeStrategyWithMarketDefaults({
    entered: enteredStrategy,
    defaults: resolvedMarketProfile.strategyDefaults,
  });

  const businessContext = [
    enteredBusinessContext,
    resolvedMarketProfile.businessContext,
  ]
    .filter(Boolean)
    .join("\n\n");

  const marketingSpine = buildMarketingSpine({
    campaignTheme,
    businessContext,
    accountName: activeAccount?.name,
    strategy,
  });

  if (!overwriteExisting) {
    const { count, error: countError } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("campaign_month", month)
      .eq("account_id", activeAccountId)
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
        { status: 409 },
      );
    }
  }

  let plan = buildMonthlyCampaignPlan({
    month,
    campaignTheme,
    businessContext,
    strategy,
    marketingSpine,
  });

  if (!plan.length) {
    return NextResponse.json(
      {
        error: "No campaign weeks were created for this month.",
        month,
      },
      { status: 400 },
    );
  }

  const aiUpgrade = await upgradePlanWithAiPublicCopy({
    supabase,
    userId: user.id,
    accountId: activeAccountId,
    month,
    campaignTheme,
    businessContext,
    strategy,
    plan,
  });

  plan = aiUpgrade.plan;
  const generationMode = aiUpgrade.generationMode;

  const campaignRows = plan.map((week) =>
    campaignPayload({
      userId: user.id,
      accountId: activeAccountId,
      month,
      campaignTheme,
      businessContext,
      marketProfile: resolvedMarketProfile.metadata,
      week,
      generationMode,
    }),
  );

  const { data: createdCampaigns, error: campaignInsertError } = await supabase
    .from("campaigns")
    .insert(campaignRows)
    .select("*");

  if (campaignInsertError || !Array.isArray(createdCampaigns)) {
    return NextResponse.json(
      {
        error:
          campaignInsertError?.message ?? "Unable to create monthly campaigns.",
        stage: "campaign_batch_insert",
      },
      { status: 400 },
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
        accountId: activeAccountId,
        campaignId: campaign.id,
        month,
        week,
        asset,
        marketProfile: resolvedMarketProfile.metadata,
        generationMode,
      }),
    );
  });

  if (!assetRows.length) {
    return NextResponse.json(
      {
        error: "Campaigns were created, but no asset rows were prepared.",
        stage: "asset_prepare",
        campaignCount: createdCampaigns.length,
      },
      { status: 400 },
    );
  }

  const { data: createdAssets, error: assetInsertError } = await supabase
    .from("generated_assets")
    .insert(assetRows)
    .select("*");

  if (assetInsertError || !Array.isArray(createdAssets)) {
    return NextResponse.json(
      {
        error:
          assetInsertError?.message ?? "Unable to create generated assets.",
        stage: "asset_batch_insert",
        campaignCount: createdCampaigns.length,
        attemptedAssetCount: assetRows.length,
      },
      { status: 400 },
    );
  }

  const linkWarnings: string[] = [];

  for (const promptAsset of createdAssets.filter(
    (asset) => asset.asset_type === "galaxyai_prompt",
  )) {
    const companionVideoScript = createdAssets.find(
      (asset) =>
        asset.asset_type === "video_script" &&
        asset.campaign_id === promptAsset.campaign_id &&
        Number(asset.campaign_week_number) ===
          Number(promptAsset.campaign_week_number),
    );

    if (!companionVideoScript?.id) {
      linkWarnings.push(
        `GalaxyAI prompt ${promptAsset.id} was created, but no matching Friday video script was found for parent linking.`,
      );
      continue;
    }

    const metadata =
      promptAsset.metadata &&
      typeof promptAsset.metadata === "object" &&
      !Array.isArray(promptAsset.metadata)
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
          executionRule:
            "Only the approved galaxyai_prompt asset should be sent to GalaxyAI.",
        }),
      })
      .eq("id", promptAsset.id)
      .eq("account_id", activeAccountId);

    if (linkError) {
      linkWarnings.push(
        `Unable to link GalaxyAI prompt ${promptAsset.id} to video script ${companionVideoScript.id}: ${linkError.message}`,
      );
    }
  }

  for (const imagePromptAsset of createdAssets.filter(
    (asset) => asset.asset_type === "galaxyai_image_prompt",
  )) {
    const imagePromptMetadata =
      imagePromptAsset.metadata &&
      typeof imagePromptAsset.metadata === "object" &&
      !Array.isArray(imagePromptAsset.metadata)
        ? imagePromptAsset.metadata
        : {};

    const sourceSocialAssetType = String(
      imagePromptMetadata.sourceSocialAssetType ?? "",
    );
    const sourceSocialAssetSortOrder = Number(
      imagePromptMetadata.sourceSocialAssetSortOrder ?? 0,
    );

    const companionSocialPost = createdAssets.find(
      (asset) =>
        asset.campaign_id === imagePromptAsset.campaign_id &&
        Number(asset.campaign_week_number) ===
          Number(imagePromptAsset.campaign_week_number) &&
        asset.asset_type === sourceSocialAssetType &&
        Number(asset.calendar_sort_order) === sourceSocialAssetSortOrder,
    );

    const visualDirectionAsset = createdAssets.find(
      (asset) =>
        asset.campaign_id === imagePromptAsset.campaign_id &&
        Number(asset.campaign_week_number) ===
          Number(imagePromptAsset.campaign_week_number) &&
        asset.asset_type === "campaign_visual_direction",
    );

    if (!companionSocialPost?.id) {
      linkWarnings.push(
        `GalaxyAI image prompt ${imagePromptAsset.id} was created, but no matching social post was found for parent linking.`,
      );
      continue;
    }

    const { error: imageLinkError } = await supabase
      .from("generated_assets")
      .update({
        parent_asset_id: companionSocialPost.id,
        metadata: toJson({
          ...imagePromptMetadata,
          source_social_asset_id: companionSocialPost.id,
          source_social_asset_type: sourceSocialAssetType,
          display_with_asset_id: companionSocialPost.id,
          companion_to_asset_type: sourceSocialAssetType,
          visual_direction_asset_id: visualDirectionAsset?.id ?? null,
          galaxyAiExecutionAsset: false,
          executionRule:
            "This is a GalaxyAI social image prompt. It should be reviewed and approved before a later image-generation flow sends it to GalaxyAI.",
          storagePlan:
            "Future generated images should be stored in Supabase Storage under account/campaign/asset paths before being attached to social publishing payloads.",
        }),
      })
      .eq("id", imagePromptAsset.id)
      .eq("account_id", activeAccountId);

    if (imageLinkError) {
      linkWarnings.push(
        `Unable to link GalaxyAI image prompt ${imagePromptAsset.id} to social post ${companionSocialPost.id}: ${imageLinkError.message}`,
      );
    }
  }

  const warnings = [
    generationMode === "ai_humanized_public_copy"
      ? "AI humanized public-copy generation is active for blog, social, email, and video script assets."
      : "Human-safe fast draft generation is active. Public copy uses safer templates and can still be improved through review/resubmission.",
    ...aiUpgrade.warnings,
    marketingSpineReviewed
      ? "Marketing Spine review gate was confirmed before generation."
      : "Marketing Spine review gate was not confirmed by the client before generation; server rebuilt the spine from submitted inputs.",
    ...linkWarnings,
  ];

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: activeAccountId,
    activity_type: "monthly_campaign_package_generated",
    title: "Monthly campaign package generated",
    description: `${createdCampaigns.length} campaign(s) and ${createdAssets.length} generated asset(s) created for ${month}.`,
    metadata: {
      month,
      generationMode,
      campaignTheme,
      businessContext,
      activeAccountId,
      marketProfile: resolvedMarketProfile.metadata,
      marketProfileSummary: marketProfileSummary(marketProfileOptions),
      marketingSpine: marketingSpineSummary(marketingSpine),
      marketingSpineGateStatus: marketingSpine.gateStatus,
      marketingSpineReadinessScore: marketingSpine.readinessScore,
      marketingSpineReviewGate: marketingSpineReviewed ? "confirmed" : "server_rebuilt_unconfirmed",
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
    activeAccountId,
    marketProfile: resolvedMarketProfile.metadata,
    marketingSpine: marketingSpineSummary(marketingSpine),
    marketingSpineReviewGate: marketingSpineReviewed ? "confirmed" : "server_rebuilt_unconfirmed",
    generationMode,
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
