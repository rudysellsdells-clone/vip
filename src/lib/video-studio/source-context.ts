import "server-only";

import { buildCampaignAdPackageDraft } from "@/lib/ad-studio/google-search-campaign-context";
import { adPackageFromMetadata } from "./video-asset";
import type { VideoPackage, VideoProvider, VideoSourceReference } from "./video-package";

export type VideoSourceContext = {
  accountId: string;
  campaignId: string | null;
  source: VideoSourceReference;
  objective: string;
  audience: string;
  offer: string;
  destinationUrl: string | null;
  strategySnapshot: Record<string, unknown>;
  lineage: VideoPackage["lineage"];
  creativeSource: Record<string, unknown>;
};

export async function buildCampaignVideoSourceContext({
  supabase,
  campaign,
  destinationUrl,
}: {
  supabase: any;
  campaign: Record<string, any>;
  destinationUrl: string;
}): Promise<VideoSourceContext> {
  const approved = await buildCampaignAdPackageDraft({
    supabase,
    campaign: campaign as any,
    destinationUrl,
    channel: "meta",
  });

  const foundation = approved.strategy.strategySnapshot.strategyFoundation as
    | Record<string, unknown>
    | undefined;

  return {
    accountId: approved.accountId,
    campaignId: approved.campaignId,
    source: {
      type: "campaign",
      id: approved.campaignId,
      title: approved.campaignName,
      campaignId: approved.campaignId,
      assetId: null,
    },
    objective: approved.objective,
    audience: approved.audience,
    offer: approved.offer,
    destinationUrl: approved.destinationUrl,
    strategySnapshot: approved.strategy.strategySnapshot,
    lineage: {
      campaignStrategySignature: approved.strategy.strategySignature,
      strategyFoundationSignature:
        typeof foundation?.signature === "string" ? foundation.signature : null,
      marketIntelligenceSignature:
        approved.strategy.marketIntelligenceSignature,
      evidenceSourceIds: approved.strategy.evidenceSourceIds,
    },
    creativeSource: {
      campaignName: approved.campaignName,
      approvedStrategy: approved.strategy.strategySnapshot,
    },
  };
}

export function buildAdVideoSourceContext({
  asset,
  provider,
}: {
  asset: Record<string, any>;
  provider: VideoProvider;
}): VideoSourceContext {
  const adPackage = adPackageFromMetadata(asset.metadata);
  if (!adPackage) throw new Error("The selected asset is not an Ad Studio package.");
  if (asset.status !== "approved") {
    throw new Error("Approve the ad package before turning it into video.");
  }

  const foundation = adPackage.strategy.strategySnapshot.strategyFoundation as
    | Record<string, unknown>
    | undefined;
  const selectedVariant = adPackage.variants[0] ?? null;

  return {
    accountId: adPackage.accountId,
    campaignId: adPackage.campaignId,
    source: {
      type: "ad_package",
      id: String(asset.id),
      title: String(asset.title ?? adPackage.title),
      campaignId: adPackage.campaignId,
      assetId: String(asset.id),
    },
    objective: adPackage.objective,
    audience: adPackage.audience,
    offer: adPackage.offer,
    destinationUrl: adPackage.destinationUrl,
    strategySnapshot: adPackage.strategy.strategySnapshot,
    lineage: {
      campaignStrategySignature: adPackage.strategy.strategySignature,
      strategyFoundationSignature:
        typeof foundation?.signature === "string" ? foundation.signature : null,
      marketIntelligenceSignature:
        adPackage.strategy.marketIntelligenceSignature,
      evidenceSourceIds: adPackage.strategy.evidenceSourceIds,
    },
    creativeSource: {
      provider,
      channel: adPackage.channel,
      packageTitle: adPackage.title,
      selectedVariant,
      attribution: adPackage.attribution,
    },
  };
}
