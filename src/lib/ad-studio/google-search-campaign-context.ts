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

function recordValue(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasRecordValues(value: Record<string, any>) {
  return Object.keys(value).length > 0;
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

  const storedStrategy = recordValue(campaign.strategy);
  const storedFoundationContainer = recordValue(storedStrategy.strategyFoundation);
  const storedFoundationSnapshot = recordValue(storedFoundationContainer.snapshot);
  const storedFoundationSignature = stringValue(storedFoundationContainer.signature);
  const storedMarketContainer = recordValue(storedStrategy.marketIntelligence);
  const storedMarketSnapshot = recordValue(storedMarketContainer.snapshot);
  const storedMarketSignature = stringValue(storedMarketContainer.signature);

  const [currentFoundation, currentMarketIntelligenceSnapshot] = await Promise.all([
    getApprovedStrategyFoundation({
      supabase,
      accountId: String(campaign.account_id),
    }),
    getApprovedMarketIntelligenceSnapshot({
      supabase,
      accountId: String(campaign.account_id),
    }),
  ]);

  const campaignSourceSignature = computeOneOffStrategySourceSignature(
    campaign as any,
  );
  const currentFoundationSignature =
    computeStrategyFoundationSignature(currentFoundation);
  const currentMarketIntelligenceSignature = currentMarketIntelligenceSnapshot
    ? computeApprovedMarketIntelligenceSignature(
        currentMarketIntelligenceSnapshot,
      )
    : null;
  const combinedApprovalSignature = computeStrategyApprovalSourceSignature({
    campaignSourceSignature,
    foundationSignature: currentFoundationSignature,
    marketIntelligenceSignature: currentMarketIntelligenceSignature,
  });

  const usesCampaignSnapshot = gate.sourceSignature === campaignSourceSignature;
  const usesCurrentCombinedApproval =
    gate.sourceSignature === combinedApprovalSignature;

  if (!usesCampaignSnapshot && !usesCurrentCombinedApproval) {
    throw new Error(
      "Campaign inputs changed after the Marketing Spine was approved. Regenerate and approve the Marketing Spine before creating ads.",
    );
  }

  // Campaign Workspace approvals intentionally freeze the Strategy Foundation and
  // Market Intelligence snapshots captured with the campaign. Generating from those
  // stored snapshots keeps approved strategy stable even when the live account
  // strategy or research workspace changes later.
  const foundation =
    usesCampaignSnapshot && hasRecordValues(storedFoundationSnapshot)
      ? storedFoundationSnapshot
      : currentFoundation;
  const foundationSignature =
    usesCampaignSnapshot && storedFoundationSignature
      ? storedFoundationSignature
      : currentFoundationSignature;
  const marketIntelligenceSnapshot =
    usesCampaignSnapshot && hasRecordValues(storedMarketSnapshot)
      ? storedMarketSnapshot
      : currentMarketIntelligenceSnapshot;
  const marketIntelligenceSignature =
    usesCampaignSnapshot && storedMarketSignature
      ? storedMarketSignature
      : currentMarketIntelligenceSignature;
  const sourceIds = marketIntelligenceSnapshot
    ? [
        ...new Set(
          (Array.isArray(marketIntelligenceSnapshot.findings)
            ? marketIntelligenceSnapshot.findings
            : []
          ).flatMap((item: Record<string, any>) =>
            Array.isArray(item.sourceIds) ? item.sourceIds : [],
          ),
        ),
      ]
    : [];
  const campaignSlug = normalizeUtmToken(
    campaign.name,
    "vip-campaign",
    100,
  );

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
      strategySignatureFormat: usesCampaignSnapshot
        ? "campaign_inputs_with_stored_context"
        : "combined_approval",
      strategyContextSource: usesCampaignSnapshot
        ? "campaign_snapshot"
        : "current_approved_context",
      campaignSourceSignature,
      combinedApprovalSignature,
      foundationVersion: foundation.version,
      foundationSignature,
      marketIntelligenceVersion: marketIntelligenceSnapshot?.version ?? null,
      marketIntelligenceSignature,
      marketIntelligenceFindingCount: Array.isArray(
        marketIntelligenceSnapshot?.findings,
      )
        ? marketIntelligenceSnapshot.findings.length
        : 0,
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
