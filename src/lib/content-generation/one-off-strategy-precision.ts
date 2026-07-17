import type { CampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import type { OneOffPromptCampaign } from "@/lib/content-generation/one-off-campaign-brief";
import type { OneOffCampaignStrategy } from "@/lib/content-generation/one-off-strategy-gate";

type UnknownRecord = Record<string, unknown>;

export type OneOffStrategyPrecisionIssue = {
  field: keyof OneOffCampaignStrategy | "crossSection";
  code: string;
  message: string;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "because",
  "been",
  "before",
  "being",
  "business",
  "campaign",
  "company",
  "could",
  "from",
  "have",
  "into",
  "more",
  "most",
  "need",
  "offer",
  "only",
  "other",
  "should",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "through",
  "using",
  "very",
  "want",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

const GENERIC_STRATEGY_PHRASES = [
  "build trust",
  "increase visibility",
  "improve visibility",
  "grow the business",
  "grow your business",
  "save time",
  "easy marketing",
  "marketing that works",
  "reach more customers",
  "get more leads",
];

const MOMENT_MARKERS = /\b(when|as|after|before|once|during|currently|right now|recently|at the point|at the moment|the moment)\b/i;
const ROLE_MARKERS = /\b(owner|owners|operator|operators|manager|managers|director|directors|leader|leaders|decision-maker|decision-makers|executive|executives|practice administrator|practice administrators)\b/i;
const TRADE_MARKERS = [
  "contractor",
  "builder",
  "painter",
  "tile",
  "electrician",
  "hvac",
  "plumber",
  "landscap",
  "concrete",
  "tree service",
  "carpenter",
  "roof",
  "home service",
];

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clean(value: unknown, maxLength = 5000) {
  const text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function wordCount(value: string) {
  return clean(value).split(/\s+/).filter(Boolean).length;
}

function lowerFirst(value: string) {
  const text = clean(value);
  if (!text) return "";
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

function stripTrailingPunctuation(value: string) {
  return clean(value).replace(/[.!?;:,]+$/, "");
}

function recordValue(record: unknown, keys: string[]) {
  if (!isRecord(record)) return "";

  for (const key of keys) {
    const value = clean(record[key], 900);
    if (value) return value;
  }

  return "";
}

function tokenize(value: string) {
  return new Set(
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((token) => token.replace(/^-+|-+$/g, ""))
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

function similarity(left: string, right: string) {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (!leftTokens.size || !rightTokens.size) return 0;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

function separatorCount(value: string) {
  return (value.match(/[,;|/]/g) ?? []).length;
}

function tradeMatchCount(value: string) {
  const normalized = value.toLowerCase();
  return TRADE_MARKERS.filter((marker) => normalized.includes(marker)).length;
}

export function looksLikeAudienceDump(value: string) {
  const text = clean(value);
  if (!text) return false;

  return (
    text.includes("|") ||
    separatorCount(text) >= 4 ||
    tradeMatchCount(text) >= 4 ||
    (wordCount(text) > 65 && separatorCount(text) >= 2)
  );
}

function audienceCategoryFromText(value: string) {
  const text = clean(value).toLowerCase();
  if (!text) return "";

  if (
    tradeMatchCount(text) >= 2 ||
    /\b(home service|construction trade|building contractor)\b/.test(text)
  ) {
    return "Owners and operators of small-to-midsized home-service contracting businesses";
  }

  if (/^contractors?$/.test(text) || /\bcontracting businesses?\b/.test(text)) {
    return "Owners and operators of small-to-midsized contracting businesses";
  }

  if (/\bdent(al|ist|ists|istry)\b/.test(text)) {
    return "Dental practice owners and practice managers responsible for practice growth";
  }

  if (/\bpool service|pool compan|pool contractor/.test(text)) {
    return "Owners and operators of independent pool service companies";
  }

  if (/\blandscap|lawn care|lawn service/.test(text)) {
    return "Owners and operators of landscaping and lawn-care companies";
  }

  if (/\bmanufactur|industrial/.test(text)) {
    return "Commercial and marketing leaders at small-to-midsized manufacturing companies";
  }

  if (/\bhealthcare|medical practice|clinic/.test(text)) {
    return "Owners and operational leaders of independent healthcare practices";
  }

  if (/\be-?commerce|retail/.test(text)) {
    return "Business leaders responsible for e-commerce and digital revenue growth";
  }

  return "";
}

function candidateAudienceValues(
  campaign: OneOffPromptCampaign,
  intelligence: CampaignIntelligenceContext,
) {
  const selectedBuyer = intelligence.selectedBuyerSegments[0];
  const selectedBuyerName = recordValue(selectedBuyer, ["name", "title", "label"]);
  const selectedBuyerDescription = recordValue(selectedBuyer, ["description"]);

  return [
    campaign.audience,
    campaign.buyer_segment,
    selectedBuyerName,
    selectedBuyerDescription,
    intelligence.brief.audience.confidence === "missing"
      ? ""
      : intelligence.brief.audience.value,
  ]
    .map((value) => clean(value, 1200))
    .filter(Boolean);
}

export function derivePrimaryAudience(
  campaign: OneOffPromptCampaign,
  intelligence: CampaignIntelligenceContext,
) {
  const candidates = candidateAudienceValues(campaign, intelligence);

  for (const candidate of candidates) {
    if (looksLikeAudienceDump(candidate)) continue;
    const mapped = audienceCategoryFromText(candidate);
    if (mapped) return mapped;

    if (ROLE_MARKERS.test(candidate) && wordCount(candidate) <= 36) {
      return stripTrailingPunctuation(candidate);
    }

    if (wordCount(candidate) <= 14 && separatorCount(candidate) <= 1) {
      const normalized = stripTrailingPunctuation(candidate);
      if (/\b(contractor|business|company|practice|agency|firm|manufacturer|retailer)s?\b/i.test(normalized)) {
        return `Owners and decision-makers at ${lowerFirst(normalized)}`;
      }
      return normalized;
    }
  }

  for (const candidate of candidates) {
    const mapped = audienceCategoryFromText(candidate);
    if (mapped) return mapped;
  }

  const first = candidates[0]?.split(/[,;|/]/)[0]?.trim();
  if (first) {
    return ROLE_MARKERS.test(first)
      ? stripTrailingPunctuation(first)
      : `Primary decision-makers in ${lowerFirst(stripTrailingPunctuation(first))}`;
  }

  return "The primary decision-maker responsible for the campaign's business outcome";
}

function hasGenericPhrase(value: string) {
  const normalized = value.toLowerCase();
  return GENERIC_STRATEGY_PHRASES.some((phrase) => normalized.includes(phrase));
}

function usableBriefValue(value: { value: string; confidence: string } | undefined) {
  if (!value || value.confidence === "missing") return "";
  const text = clean(value.value, 1600);
  return /^not explicitly established/i.test(text) ? "" : text;
}

function containsSourceDump(
  value: string,
  campaign: OneOffPromptCampaign,
  intelligence: CampaignIntelligenceContext,
) {
  const normalized = clean(value).toLowerCase();
  if (!normalized) return false;

  return candidateAudienceValues(campaign, intelligence)
    .filter((candidate) => looksLikeAudienceDump(candidate))
    .some((candidate) => {
      const candidateNormalized = clean(candidate).toLowerCase();
      return candidateNormalized.length >= 50 && normalized.includes(candidateNormalized);
    });
}

export function assessOneOffStrategyPrecision({
  strategy,
  campaign,
  intelligence,
}: {
  strategy: OneOffCampaignStrategy;
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
}) {
  const issues: OneOffStrategyPrecisionIssue[] = [];

  if (
    looksLikeAudienceDump(strategy.targetAudience) ||
    containsSourceDump(strategy.targetAudience, campaign, intelligence)
  ) {
    issues.push({
      field: "targetAudience",
      code: "audience_list_dump",
      message:
        "Target audience repeats or expands a long source list. Select one primary buyer category and no more than two examples.",
    });
  }

  if (wordCount(strategy.targetAudience) < 5 || !ROLE_MARKERS.test(strategy.targetAudience)) {
    issues.push({
      field: "targetAudience",
      code: "audience_missing_decision_maker",
      message:
        "Target audience should identify a primary decision-maker and the relevant business context, not only an industry label.",
    });
  }

  if (
    !MOMENT_MARKERS.test(strategy.buyerSituation) ||
    wordCount(strategy.buyerSituation) < 24
  ) {
    issues.push({
      field: "buyerSituation",
      code: "buyer_situation_not_a_moment",
      message:
        "Buyer situation must describe a recognizable trigger: what is happening now, what the buyer is doing, what has stopped working, and why the issue matters at this moment.",
    });
  }

  if (
    similarity(strategy.buyerSituation, strategy.targetAudience) >= 0.72 ||
    similarity(strategy.buyerSituation, strategy.coreProblem) >= 0.72
  ) {
    issues.push({
      field: "buyerSituation",
      code: "buyer_situation_duplicates_neighbor",
      message:
        "Buyer situation substantially repeats the audience or core problem instead of describing a moment in the buyer's work.",
    });
  }

  const crossSectionPairs: Array<[
    keyof OneOffCampaignStrategy,
    keyof OneOffCampaignStrategy,
  ]> = [
    ["coreProblem", "businessConsequence"],
    ["campaignPointOfView", "offerExplanation"],
    ["offerExplanation", "offerDeliverables"],
  ];

  for (const [left, right] of crossSectionPairs) {
    if (similarity(strategy[left], strategy[right]) < 0.78) continue;
    issues.push({
      field: "crossSection",
      code: `${left}_${right}_overlap`,
      message: `${left} and ${right} repeat the same idea. Give each section its own strategic job.`,
    });
  }

  if (hasGenericPhrase(strategy.campaignPointOfView)) {
    issues.push({
      field: "campaignPointOfView",
      code: "generic_point_of_view",
      message:
        "Campaign point of view relies on generic marketing language. State a specific belief about why the current approach fails and what the buyer should do differently.",
    });
  }

  if (hasGenericPhrase(strategy.campaignObjective) && wordCount(strategy.campaignObjective) < 22) {
    issues.push({
      field: "campaignObjective",
      code: "generic_objective",
      message:
        "Campaign objective is too generic. Define the decision or commercial action this campaign should make more likely.",
    });
  }

  return issues;
}

function buildBuyerSituation({
  strategy,
  campaign,
  audience,
}: {
  strategy: OneOffCampaignStrategy;
  campaign: OneOffPromptCampaign;
  audience: string;
}) {
  const problem = stripTrailingPunctuation(strategy.coreProblem || campaign.idea);
  const outcome = stripTrailingPunctuation(
    campaign.goal || strategy.businessConsequence || "a dependable business result",
  );
  const subject = lowerFirst(audience || "the intended decision-maker");

  return [
    `The issue becomes important when ${subject} can see that ${lowerFirst(problem || "the current approach is no longer producing a dependable result")}.`,
    `The familiar approach may still be in place, but it is no longer creating a clear path to ${lowerFirst(outcome)}—making it reasonable to evaluate a better next step now.`,
  ].join(" ");
}

export function enforceOneOffStrategyPrecision({
  strategy,
  campaign,
  intelligence,
}: {
  strategy: OneOffCampaignStrategy;
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
}): OneOffCampaignStrategy {
  const primaryAudience = derivePrimaryAudience(campaign, intelligence);
  const targetAudience =
    looksLikeAudienceDump(strategy.targetAudience) ||
    containsSourceDump(strategy.targetAudience, campaign, intelligence) ||
    wordCount(strategy.targetAudience) < 5 ||
    !ROLE_MARKERS.test(strategy.targetAudience)
      ? primaryAudience
      : stripTrailingPunctuation(strategy.targetAudience);

  const buyerSituationNeedsRewrite =
    !MOMENT_MARKERS.test(strategy.buyerSituation) ||
    wordCount(strategy.buyerSituation) < 24 ||
    similarity(strategy.buyerSituation, targetAudience) >= 0.72 ||
    similarity(strategy.buyerSituation, strategy.coreProblem) >= 0.72;

  const campaignObjective =
    hasGenericPhrase(strategy.campaignObjective) &&
    wordCount(strategy.campaignObjective) < 22
      ? `Move ${lowerFirst(targetAudience)} from recognizing ${lowerFirst(
          stripTrailingPunctuation(strategy.coreProblem || campaign.idea),
        )} to viewing “${clean(campaign.cta || strategy.primaryCta)}” as a reasonable next step.`
      : strategy.campaignObjective;

  const briefConsequence = usableBriefValue(intelligence.brief.businessConsequence);
  const businessConsequence =
    similarity(strategy.coreProblem, strategy.businessConsequence) >= 0.78
      ? briefConsequence && similarity(strategy.coreProblem, briefConsequence) < 0.72
        ? briefConsequence
        : campaign.goal
          ? `If the problem continues, the business will have a harder time achieving ${lowerFirst(
              stripTrailingPunctuation(campaign.goal),
            )} because the underlying issue remains unresolved.`
          : "If the problem continues, the desired business outcome becomes harder to achieve because the underlying issue remains unresolved."
      : strategy.businessConsequence;

  const briefPointOfView = usableBriefValue(intelligence.brief.uniquePointOfView);
  const campaignPointOfView =
    hasGenericPhrase(strategy.campaignPointOfView) ||
    similarity(strategy.campaignPointOfView, strategy.offerExplanation) >= 0.78
      ? briefPointOfView || strategy.campaignPointOfView
      : strategy.campaignPointOfView;

  const briefDeliverables = usableBriefValue(intelligence.brief.offerDeliverables);
  const offerDeliverables =
    similarity(strategy.offerExplanation, strategy.offerDeliverables) >= 0.78 &&
    briefDeliverables
      ? briefDeliverables
      : strategy.offerDeliverables;

  return {
    ...strategy,
    campaignObjective,
    targetAudience,
    buyerSituation: buyerSituationNeedsRewrite
      ? buildBuyerSituation({ strategy, campaign, audience: targetAudience })
      : strategy.buyerSituation,
    businessConsequence,
    campaignPointOfView,
    offerDeliverables,
  };
}

export function formatStrategyPrecisionIssues(
  issues: OneOffStrategyPrecisionIssue[],
) {
  return issues.length
    ? issues.map((issue, index) => `${index + 1}. ${issue.message}`).join("\n")
    : "No precision issues detected.";
}

export function buildStrategyPrecisionSourceSnapshot({
  campaign,
  intelligence,
}: {
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
}) {
  const brief = intelligence.brief;
  const primaryAudience = derivePrimaryAudience(campaign, intelligence);

  const supported = (value: { value: string; confidence: string }) =>
    value.confidence === "missing" ? "Not established" : clean(value.value, 1000);

  return [
    `Primary audience to prioritize: ${primaryAudience}`,
    `Buyer decision-moment source: ${supported(brief.decisionMoment)}`,
    `Visible problem source: ${supported(brief.visibleProblem)}`,
    `Underlying problem source: ${supported(brief.underlyingProblem)}`,
    `Business consequence source: ${supported(brief.businessConsequence)}`,
    `Offer mechanism source: ${supported(brief.offerMechanism)}`,
    `Offer deliverables source: ${supported(brief.offerDeliverables)}`,
    `Approved proof source: ${supported(brief.approvedProof)}`,
    `Primary objection source: ${supported(brief.primaryObjection)}`,
    `CTA source: ${supported(brief.callToAction)}`,
  ].join("\n");
}
