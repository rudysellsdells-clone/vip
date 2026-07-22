import {
  formatDigitalCloneContext,
  type DigitalCloneContext,
} from "@/lib/clone/context";
import type { StrategyFoundation } from "@/lib/strategy/strategy-foundation";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function prefer(primary: string, fallback: unknown) {
  return primary.trim() || String(fallback ?? "").trim();
}

export function mergeStrategyFoundationIntoCloneContext({
  foundation,
  cloneContext,
}: {
  foundation: StrategyFoundation;
  cloneContext: DigitalCloneContext;
}): DigitalCloneContext {
  const existingProfile = record(cloneContext.profile);
  const existingBrandProfile = record(cloneContext.accountBrandProfile);

  const profile = {
    ...existingProfile,
    business_summary: prefer(
      foundation.evidence.businessSummary,
      existingProfile.business_summary,
    ),
    audience_summary: prefer(
      foundation.evidence.audienceSummary,
      existingProfile.audience_summary,
    ),
    offer_summary: prefer(
      foundation.evidence.offerSummary,
      existingProfile.offer_summary,
    ),
    voice_summary: prefer(
      foundation.brandExpression.voiceSummary || foundation.brandExpression.tone,
      existingProfile.voice_summary,
    ),
    sales_outcome_summary: prefer(
      foundation.evidence.salesOutcomeSummary,
      existingProfile.sales_outcome_summary,
    ),
  };

  const accountBrandProfile = {
    ...existingBrandProfile,
    company_name: prefer(
      foundation.businessTruth.companyName,
      existingBrandProfile.company_name,
    ),
    website_url: prefer(
      foundation.businessTruth.websiteUrl,
      existingBrandProfile.website_url,
    ),
    primary_cta: prefer(
      foundation.businessTruth.primaryCta || foundation.campaignDefaults.callToAction,
      existingBrandProfile.primary_cta,
    ),
    phone: prefer(
      foundation.businessTruth.phone,
      existingBrandProfile.phone,
    ),
    target_audience: prefer(
      foundation.campaignDefaults.targetAudience,
      existingBrandProfile.target_audience,
    ),
    tone: prefer(
      foundation.brandExpression.tone || foundation.brandExpression.voiceSummary,
      existingBrandProfile.tone,
    ),
    service_areas: foundation.businessTruth.serviceAreas.length
      ? foundation.businessTruth.serviceAreas.join(", ")
      : String(existingBrandProfile.service_areas ?? ""),
    core_offers: prefer(
      foundation.campaignDefaults.primaryOffer,
      existingBrandProfile.core_offers,
    ),
    approved_hashtags: foundation.brandExpression.approvedHashtags.length
      ? foundation.brandExpression.approvedHashtags.join(" ")
      : String(existingBrandProfile.approved_hashtags ?? ""),
    brand_colors: foundation.brandExpression.brandColors.length
      ? foundation.brandExpression.brandColors
      : existingBrandProfile.brand_colors,
    notes: prefer(
      foundation.brandExpression.notes,
      existingBrandProfile.notes,
    ),
    strategy_foundation_version: foundation.version,
    strategy_foundation_readiness: foundation.readiness.score,
  };

  const brandRules = foundation.brandExpression.rules.map((rule, index) => ({
    id: `strategy-foundation-rule-${index}`,
    rule_text: rule.text,
    category: rule.category,
    priority: rule.priority,
    active: true,
  }));

  const serviceLines = foundation.market.serviceLines.map((serviceLine) => ({
    id: serviceLine.id,
    name: serviceLine.name,
    short_name: serviceLine.shortName,
    description: serviceLine.description,
    primary_outcome: serviceLine.primaryOutcome,
    active: true,
  }));

  const buyerSegments = foundation.market.audiences.map((audience) => ({
    id: audience.id,
    name: audience.name,
    description: audience.description,
    common_pains: audience.commonPains,
    desired_outcomes: audience.desiredOutcomes,
    objections: audience.objections,
    active: true,
  }));

  const offers = foundation.market.offers.map((offer) => ({
    id: offer.id,
    service_line_id: offer.serviceLineId,
    name: offer.name,
    description: offer.description,
    offer_type: offer.offerType,
    primary_cta: offer.primaryCta,
    outcome: offer.outcome,
    price_notes: offer.priceNotes,
    target_buyer_segments: offer.targetBuyerSegments,
    active: true,
  }));

  const merged: Omit<DigitalCloneContext, "formattedContext"> = {
    profile,
    accountBrandProfile,
    brandRules,
    contentExamples: cloneContext.contentExamples,
    knowledgeSources: cloneContext.knowledgeSources,
    serviceLines,
    buyerSegments,
    offers,
  };

  return {
    ...merged,
    formattedContext: [
      `## Approved Strategy Foundation v${foundation.version}`,
      `Readiness: ${foundation.readiness.score}/100`,
      "This account-owned foundation is the source of truth. Campaign inputs may refine the angle, but they must not contradict these facts, audiences, offers, voice rules, or approved outcomes.",
      "",
      formatDigitalCloneContext(merged),
    ].join("\n"),
  };
}
