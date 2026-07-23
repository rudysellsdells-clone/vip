import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import type { AdPackage, PaidSocialAdVariant } from "@/lib/ad-studio/ad-package";
import {
  buildAdPackageTrackedUrl,
  scoreAdPackage,
} from "@/lib/ad-studio/ad-package-scoring";
import { isAdStudioEnabled } from "@/lib/ad-studio/feature";
import { buildCampaignAdPackageDraft } from "@/lib/ad-studio/google-search-campaign-context";
import { generatePaidSocialAdPackage } from "@/lib/ad-studio/paid-social-generator";
import { logActivity } from "@/lib/security/auditLog";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import type { Json } from "@/types/database.types";

export const maxDuration = 120;

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function text(value: unknown, maxLength = 2000) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > maxLength
    ? normalized.slice(0, maxLength).trim()
    : normalized;
}

function renderVariant(variant: PaidSocialAdVariant, index: number) {
  return [
    `CONCEPT ${index + 1}: ${variant.name}`,
    "",
    "PRIMARY TEXT",
    variant.primaryText,
    "",
    `HEADLINE: ${variant.headline}`,
    `DESCRIPTION: ${variant.description}`,
    `CALL TO ACTION: ${variant.callToAction}`,
    "",
    "AUDIENCE FRAME",
    variant.audienceFrame,
    "",
    "CREATIVE BRIEF",
    variant.creativeBrief,
  ].join("\n");
}

function renderPackageContent(
  adPackage: AdPackage,
  trackedUrl: string,
  score: ReturnType<typeof scoreAdPackage>,
) {
  const variants = adPackage.variants.filter(
    (item): item is PaidSocialAdVariant => item.kind === "paid_social",
  );
  return [
    adPackage.title,
    `Campaign: ${adPackage.campaignName}`,
    `Platform: ${adPackage.channel === "meta" ? "Meta" : "LinkedIn"}`,
    `Objective: ${adPackage.objective}`,
    `Audience: ${adPackage.audience}`,
    `Offer: ${adPackage.offer}`,
    `Final URL: ${adPackage.destinationUrl}`,
    `Tracked URL: ${trackedUrl}`,
    `UTM source / medium: ${adPackage.attribution.source} / ${adPackage.attribution.medium}`,
    `Readiness score: ${score.total}/100 (${score.rating.replaceAll("_", " ")})`,
    "",
    ...variants.flatMap((variant, index) => [
      renderVariant(variant, index),
      "",
      "----------------------------------------",
      "",
    ]),
  ].join("\n").trim();
}

export async function POST(request: Request) {
  if (!isAdStudioEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const supabase = untypedSupabase(await createClient());
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const campaignId = text(body.campaignId, 200);
    const destinationUrl = text(body.destinationUrl, 2000);
    const platform =
      body.platform === "linkedin"
        ? "linkedin"
        : body.platform === "meta"
          ? "meta"
          : null;
    if (!campaignId || !destinationUrl || !platform) {
      return NextResponse.json(
        { error: "Campaign, platform, and destination URL are required." },
        { status: 400 },
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();
    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const accountId = campaign.account_id ? String(campaign.account_id) : null;
    const access = await getAccountAccessForUser({
      supabase,
      accountId,
      userId: user.id,
    });
    if (!accountId || !access.canManage) {
      return NextResponse.json(
        { error: "You do not have permission to generate ads for this campaign." },
        { status: 403 },
      );
    }

    const draft = await buildCampaignAdPackageDraft({
      supabase,
      campaign,
      destinationUrl,
      channel: platform,
    });
    const generated = await generatePaidSocialAdPackage(draft);
    const unscoredPackage: AdPackage = {
      ...draft,
      status: "needs_review",
      variants: generated.variants,
      metadata: {
        ...draft.metadata,
        model: generated.model,
        generatedAt: generated.generatedAt,
      },
    };
    const score = scoreAdPackage(unscoredPackage);
    const trackedUrl = buildAdPackageTrackedUrl(unscoredPackage);
    const adPackage: AdPackage = {
      ...unscoredPackage,
      metadata: {
        ...unscoredPackage.metadata,
        adScore: score,
        trackedUrl,
      },
    };
    const content = renderPackageContent(adPackage, trackedUrl, score);

    const { data: asset, error: insertError } = await supabase
      .from("generated_assets")
      .insert({
        account_id: accountId,
        user_id: user.id,
        campaign_id: campaign.id,
        asset_type: adPackage.assetType,
        title: adPackage.title,
        content,
        status: "needs_review",
        metadata: toJson({
          generatedBy: "ad_studio",
          workflowVersion: "h1.17d",
          adPackage,
          adScore: score,
          trackedUrl,
          analytics: {
            destination_url: adPackage.destinationUrl,
            tracked_url: trackedUrl,
            utm_source: adPackage.attribution.source,
            utm_medium: adPackage.attribution.medium,
            utm_campaign: adPackage.attribution.campaign,
            utm_content: adPackage.attribution.content,
            utm_term: adPackage.attribution.term,
          },
          destinationUrl: adPackage.destinationUrl,
          channel: platform,
          distributionType: "paid",
          promotionType: "paid_social_ad",
          isPaid: true,
          evidenceSourceIds: adPackage.strategy.evidenceSourceIds,
          strategySignature: adPackage.strategy.strategySignature,
          marketIntelligenceSignature:
            adPackage.strategy.marketIntelligenceSignature,
        }),
      })
      .select("*")
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    const platformLabel = platform === "meta" ? "Meta" : "LinkedIn";
    await logActivity(supabase, {
      userId: user.id,
      activityType: "paid_social_ad_package_generated",
      title: `${platformLabel} ad package generated`,
      description: `${campaign.name} received ${generated.variants.length} ${platformLabel} concepts.`,
      metadata: toJson({
        accountId,
        campaignId: campaign.id,
        assetId: asset.id,
        platform,
        variantCount: generated.variants.length,
        model: generated.model,
        destinationUrl: adPackage.destinationUrl,
        trackedUrl,
        adScore: score,
        strategySignature: adPackage.strategy.strategySignature,
        marketIntelligenceSignature:
          adPackage.strategy.marketIntelligenceSignature,
      }),
    });

    return NextResponse.json(
      {
        asset,
        adPackage,
        score,
        trackedUrl,
        message: `${generated.variants.length} ${platformLabel} concepts are ready for review with a ${score.total}/100 readiness score.`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unexpected Paid Social package generation error." },
      { status: 500 },
    );
  }
}
