import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { getAssetAccessForUser } from "@/lib/accounts/asset-access";
import { logActivity } from "@/lib/security/auditLog";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { isVideoStudioEnabled } from "@/lib/video-studio/feature";
import { generateVideoPackage } from "@/lib/video-studio/video-generator";
import {
  buildAdVideoSourceContext,
  buildCampaignVideoSourceContext,
} from "@/lib/video-studio/source-context";
import { renderVideoPackageContent } from "@/lib/video-studio/video-asset";
import type { VideoPackage, VideoProvider } from "@/lib/video-studio/video-package";
import type { Json } from "@/types/database.types";

export const maxDuration = 120;

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function text(value: unknown, maxLength = 2000) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function providerValue(value: unknown): VideoProvider | null {
  return value === "luma" || value === "magica" ? value : null;
}

function aspectRatioValue(value: unknown): VideoPackage["aspectRatio"] {
  return value === "9:16" || value === "1:1" ? value : "16:9";
}

function destinationValue(value: unknown) {
  const candidate = text(value);
  if (!candidate) throw new Error("Destination URL is required.");
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    url.hash = "";
    return url.toString();
  } catch {
    throw new Error("Destination URL must be a valid http or https address.");
  }
}

export async function POST(request: Request) {
  if (!isVideoStudioEnabled()) {
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
    const sourceType = body.sourceType === "ad_package" ? "ad_package" : "campaign";
    const sourceId = text(body.sourceId, 200);
    const provider = providerValue(body.provider);
    const aspectRatio = aspectRatioValue(body.aspectRatio);
    const destinationUrl = destinationValue(body.destinationUrl);
    if (!sourceId || !provider) {
      return NextResponse.json(
        { error: "Source and video provider are required." },
        { status: 400 },
      );
    }

    let context;
    if (sourceType === "campaign") {
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", sourceId)
        .maybeSingle();
      if (error || !campaign) {
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
          { error: "You do not have permission to create video for this campaign." },
          { status: 403 },
        );
      }
      context = await buildCampaignVideoSourceContext({
        supabase,
        campaign,
        destinationUrl,
      });
    } else {
      const access = await getAssetAccessForUser({
        supabase,
        assetId: sourceId,
        userId: user.id,
      });
      if (!access.asset || !access.accountId || !access.canManage) {
        return NextResponse.json({ error: "Approved ad package not found." }, { status: 404 });
      }
      context = buildAdVideoSourceContext({ asset: access.asset, provider });
    }

    const generated = await generateVideoPackage({ context, provider, aspectRatio });
    const videoPackage = generated.videoPackage;
    const assetType = provider === "magica" ? "galaxyai_prompt" : "video_script";
    const content = renderVideoPackageContent(videoPackage);
    const metadata = {
      generatedBy: "video_studio",
      workflowVersion: "h1.18b",
      videoPackage,
      provider,
      sourceType: videoPackage.source.type,
      sourceId: videoPackage.source.id,
      render: null,
      model: generated.model,
      generatedAt: generated.generatedAt,
      evidenceSourceIds: videoPackage.lineage.evidenceSourceIds,
      strategySignature: videoPackage.lineage.campaignStrategySignature,
      strategyFoundationSignature:
        videoPackage.lineage.strategyFoundationSignature,
      marketIntelligenceSignature:
        videoPackage.lineage.marketIntelligenceSignature,
    };

    const { data: asset, error: insertError } = await supabase
      .from("generated_assets")
      .insert({
        account_id: context.accountId,
        user_id: user.id,
        campaign_id: context.campaignId,
        parent_asset_id: videoPackage.source.assetId,
        asset_type: assetType,
        title: videoPackage.title,
        content,
        status: "needs_review",
        metadata: toJson(metadata),
      })
      .select("*")
      .single();
    if (insertError || !asset) {
      return NextResponse.json(
        { error: insertError?.message ?? "Unable to save video package." },
        { status: 400 },
      );
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "video_studio_package_generated",
      title: "Video package generated",
      description: `${videoPackage.title} is ready for review.`,
      metadata: toJson({
        accountId: context.accountId,
        campaignId: context.campaignId,
        assetId: asset.id,
        provider,
        sourceType: videoPackage.source.type,
        sourceId: videoPackage.source.id,
        model: generated.model,
      }),
    });

    return NextResponse.json(
      {
        asset,
        videoPackage,
        message: `${videoPackage.title} is ready for review before rendering with ${provider === "luma" ? "Luma" : "Magica"}.`,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected video package error." },
      { status: 400 },
    );
  }
}
