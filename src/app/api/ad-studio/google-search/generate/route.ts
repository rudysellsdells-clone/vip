import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { isAdStudioEnabled } from "@/lib/ad-studio/feature";
import { buildGoogleSearchPackageDraft } from "@/lib/ad-studio/google-search-campaign-context";
import { generateGoogleSearchAdPackage } from "@/lib/ad-studio/google-search-generator";
import type { AdPackage, SearchAdVariant } from "@/lib/ad-studio/ad-package";
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

function renderVariant(variant: SearchAdVariant, index: number) {
  return [
    `CONCEPT ${index + 1}: ${variant.name}`,
    "",
    "HEADLINES",
    ...variant.headlines.map((item, itemIndex) => `${itemIndex + 1}. ${item}`),
    "",
    "DESCRIPTIONS",
    ...variant.descriptions.map((item, itemIndex) => `${itemIndex + 1}. ${item}`),
    "",
    `DISPLAY PATH: /${variant.pathOne}/${variant.pathTwo}`,
    "",
    "KEYWORD THEMES",
    ...variant.keywordThemes.map((item) => `• ${item}`),
    "",
    "NEGATIVE KEYWORD THEMES",
    ...variant.negativeKeywordThemes.map((item) => `• ${item}`),
    "",
    "CALLOUTS",
    ...variant.callouts.map((item) => `• ${item}`),
    "",
    "SITELINKS",
    ...variant.sitelinks.flatMap((item) => [
      `• ${item.text} — ${item.destinationUrl}`,
      `  ${item.descriptionOne}`,
      `  ${item.descriptionTwo}`,
    ]),
  ].join("\n");
}

function renderPackageContent(adPackage: AdPackage) {
  const variants = adPackage.variants.filter(
    (item): item is SearchAdVariant => item.kind === "search",
  );
  return [
    adPackage.title,
    `Campaign: ${adPackage.campaignName}`,
    `Objective: ${adPackage.objective}`,
    `Audience: ${adPackage.audience}`,
    `Offer: ${adPackage.offer}`,
    `Final URL: ${adPackage.destinationUrl}`,
    `UTM source / medium: ${adPackage.attribution.source} / ${adPackage.attribution.medium}`,
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
    if (!campaignId || !destinationUrl) {
      return NextResponse.json(
        { error: "Campaign and destination URL are required." },
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

    const draft = await buildGoogleSearchPackageDraft({
      supabase,
      campaign,
      destinationUrl,
    });
    const generated = await generateGoogleSearchAdPackage(draft);
    const adPackage: AdPackage = {
      ...draft,
      status: "needs_review",
      variants: generated.variants,
      metadata: {
        ...draft.metadata,
        model: generated.model,
        generatedAt: generated.generatedAt,
      },
    };
    const content = renderPackageContent(adPackage);

    const { data: asset, error: insertError } = await supabase
      .from("generated_assets")
      .insert({
        account_id: accountId,
        user_id: user.id,
        campaign_id: campaign.id,
        asset_type: "search_ad",
        title: adPackage.title,
        content,
        status: "needs_review",
        metadata: toJson({
          generatedBy: "ad_studio",
          workflowVersion: "h1.17b",
          adPackage,
          analytics: {
            destination_url: adPackage.destinationUrl,
            utm_source: adPackage.attribution.source,
            utm_medium: adPackage.attribution.medium,
            utm_campaign: adPackage.attribution.campaign,
            utm_content: adPackage.attribution.content,
            utm_term: adPackage.attribution.term,
          },
          destinationUrl: adPackage.destinationUrl,
          distributionType: "paid",
          promotionType: "search_ad",
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

    await logActivity(supabase, {
      userId: user.id,
      activityType: "google_search_ad_package_generated",
      title: "Google Search ad package generated",
      description: `${campaign.name} received ${generated.variants.length} responsive-search-ad concepts.`,
      metadata: toJson({
        accountId,
        campaignId: campaign.id,
        assetId: asset.id,
        variantCount: generated.variants.length,
        model: generated.model,
        destinationUrl: adPackage.destinationUrl,
        strategySignature: adPackage.strategy.strategySignature,
        marketIntelligenceSignature:
          adPackage.strategy.marketIntelligenceSignature,
      }),
    });

    return NextResponse.json(
      {
        asset,
        adPackage,
        message: `${generated.variants.length} Google Search concepts are ready for review.`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unexpected Google Search package generation error." },
      { status: 500 },
    );
  }
}
