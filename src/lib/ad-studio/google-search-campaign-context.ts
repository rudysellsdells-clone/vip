import "server-only";

import { normalizeUtmToken } from "@/lib/analytics/utm-taxonomy";
import {
  computeOneOffStrategySourceSignature,
  extractOneOffStrategyGate,
} from "@/lib/content-generation/one-off-strategy-gate";
import {
  computeApprovedMarketIntelligenceSignature,
  getApprovedMarketIntelligenceSnapshot,
} from "@/lib/market-intelligence/approved-market-intelligence";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
import {
  computeStrategyApprovalSourceSignature,
  computeStrategyFoundationSignature,
} from "@/lib/strategy/strategy-foundation-signature";
import {
  campaignStrategyValidationMessage,
  readStoredCampaignApprovalSignatures,
  validateCampaignStrategySignatures,
} from "./campaign-strategy-validation";
import {
  createAdPackageDraft,
  resolveAdChannelDefinition,
  type AdPackageChannel,
} from "./ad-package";

type CampaignRow = Record<string, any> & {
  id: string;
  account_id: string;
  name: string;
  strategy: unknown;
};

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function combineOffer(explanation: string, deliverables: string) {
  return [explanation.trim(), deliverables.trim()].filter(Boolean).join(" — ");
}

export async function buildCampaignAdPackageDraft({
  supabase,
  campaign,
  destinationUrl,
  channel,
}: {
  supabase: any;
  campaign: CampaignRow;
  destinationUrl: string;
  channel: AdPackageChannel;
}) {
  const definition = resolveAdChannelDefinition(channel);
  const gate = extractOneOffStrategyGate(campaign.strategy);
  if (!gate || gate.status !== "approved") {
    throw new Error(
      `Approve the campaign Marketing Spine before generating ${definition.label} ads.`,
    );
  }

  const [foundation, marketIntelligenceSnapshot] = await Promise.all([
    getApprovedStrategyFoundation({
      supabase,
      accountId: String(campaign.account_id),
    }),
    getApprovedMarketIntelligenceSnapshot({
      supabase,
      accountId: String(campaign.account_id),
    }),
  ]);
  const campaignSourceSignature =
    computeOneOffStrategySourceSignature(campaign as any);
  const foundationSignature = computeStrategyFoundationSignature(foundation);
  const marketIntelligenceSignature = marketIntelligenceSnapshot
    ? computeApprovedMarketIntelligenceSignature(marketIntelligenceSnapshot)
    : null;
  const combinedApprovalSignature = computeStrategyApprovalSourceSignature({
    campaignSourceSignature,
    foundationSignature,
    marketIntelligenceSignature,
  });
  const storedApprovalSignatures = readStoredCampaignApprovalSignatures(
    campaign.strategy,
  );
  const signatureValidation = validateCampaignStrategySignatures({
    gateSourceSignature: gate.sourceSignature,
    campaignSourceSignature,
    combinedApprovalSignature,
    storedFoundationSignature:
      storedApprovalSignatures.foundationSignature,
    currentFoundationSignature: foundationSignature,
    storedMarketIntelligenceSignature:
      storedApprovalSignatures.marketIntelligenceSignature,
    currentMarketIntelligenceSignature: marketIntelligenceSignature,
  });

  if (!signatureValidation.valid) {
    throw new Error(campaignStrategyValidationMessage(signatureValidation));
  }

  const storedStrategy = recordValue(campaign.strategy);
  const sourceIds = marketIntelligenceSnapshot
    ? [...new Set(marketIntelligenceSnapshot.findings.flatMap((item) => item.sourceIds))]
    : [];
  const campaignSlug = normalizeUtmToken(campaign.name, "vip-campaign", 100);

  return createAdPackageDraft({
    accountId: String(campaign.account_id),
    campaignId: String(campaign.id),
    campaignName: String(campaign.name),
    title: `${campaign.name} — ${definition.label} Ads`,
    channel,
    objective: gate.strategy.campaignObjective,
    audience: gate.strategy.targetAudience,
    offer: combineOffer(
      gate.strategy.offerExplanation,
      gate.strategy.offerDeliverables,
    ),
    destinationUrl,
    strategy: {
      strategySignature: gate.sourceSignature,
      marketIntelligenceSignature,
      strategySnapshot: {
        approvedCampaignStrategy: gate.strategy,
        strategyFoundation: {
          version: foundation.version,
          signature: foundationSignature,
          businessTruth: foundation.businessTruth,
          brandExpression: foundation.brandExpression,
          market: foundation.market,
          evidence: foundation.evidence,
          campaignDefaults: foundation.campaignDefaults,
        },
        marketIntelligence: marketIntelligenceSnapshot,
        storedCampaignContext: {
          serviceLineId: campaign.service_line_id ?? null,
          offerId: campaign.offer_id ?? null,
          campaignIdea: campaign.idea ?? null,
          selectedPlatforms: campaign.platforms ?? [],
          storedStrategyFoundation: storedStrategy.strategyFoundation ?? null,
          storedMarketIntelligence: storedStrategy.marketIntelligence ?? null,
        },
      },
      evidenceSourceIds: sourceIds,
    },
    attributionCampaign: campaignSlug,
    attributionContent: `${definition.channel}-package`,
    attributionTerm: null,
    metadata: {
      generatedBy: "ad_studio",
      workflowVersion: "h1.17b",
      strategyGateVersion: gate.version,
      strategyApprovedAt: gate.approvedAt,
      strategySignatureFormat: signatureValidation.format,
      campaignSourceSignature,
      combinedApprovalSignature,
      foundationVersion: foundation.version,
      foundationSignature,
      marketIntelligenceVersion: marketIntelligenceSnapshot?.version ?? null,
      marketIntelligenceSignature,
      marketIntelligenceFindingCount:
        marketIntelligenceSnapshot?.findings.length ?? 0,
      evidenceSourceCount: sourceIds.length,
    },
  });
}

export async function buildGoogleSearchPackageDraft({
  supabase,
  campaign,
  destinationUrl,
}: {
  supabase: any;
  campaign: CampaignRow;
  destinationUrl: string;
}) {
  return buildCampaignAdPackageDraft({
    supabase,
    campaign,
    destinationUrl,
    channel: "google_search",
  });
}
