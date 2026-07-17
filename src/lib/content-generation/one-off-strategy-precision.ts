import type { CampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import type { OneOffPromptCampaign } from "@/lib/content-generation/one-off-campaign-brief";
import type { OneOffCampaignStrategy } from "@/lib/content-generation/one-off-strategy-gate";

type UnknownRecord = Record<string, unknown>;

export type OneOffStrategyPrecisionIssue = {
  field: keyof OneOffCampaignStrategy | "crossSection";
  code: string;
  message: string;
};

export type CustomerCenteredStrategySource = {
  primaryAudience: string;
  campaignTopic: string;
  campaignGoal: string;
  campaignCta: string;
  tone: string;
  platforms: string[];
  buyerDescription: string;
  customerPainSignals: string[];
  customerDesiredOutcomes: string[];
  customerObjections: string[];
  offerName: string;
  offerDescription: string;
  offerOutcome: string;
  offerType: string;
  offerPriceNotes: string;
  offerCta: string;
  serviceName: string;
  serviceDescription: string;
  serviceOutcome: string;
  approvedProof: string[];
  internalDifferentiator: string;
  internalOriginalityAngle: string;
  creatorNotes: string;
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
  "drive growth",
  "achieve their goals",
  "stand out from the competition",
  "take their business to the next level",
];

const META_LANGUAGE = [
  "build a realistic moment",
  "not explicitly established",
  "not explicitly supplied",
  "explain the operational",
  "explain exactly",
  "the audience should understand",
  "the buyer needs to understand",
  "use practical explanation",
  "without inventing",
  "selected buyer",
  "campaign idea",
  "account strategy",
  "brand voice",
  "source context",
  "strategy context",
  "field label",
];

const MOMENT_MARKERS = /\b(when|as|after|before|once|during|currently|right now|recently|at the point|at the moment|the moment|starts to|begins to)\b/i;
const CURRENT_BEHAVIOR_MARKERS = /\b(currently|today|still|rely|relies|relying|handle|handles|handling|manage|manages|managing|piecemeal|reactive|reactively|between|alongside|sporadic|occasional|ad hoc)\b/i;
const CAUSAL_MARKERS = /\b(because|caused by|comes from|stems from|underlying|root|without|fragmented|inconsistent|reactive|rely|depends on|absence of|lack of|disconnect between)\b/i;
const CONSEQUENCE_MARKERS = /\b(cost|costs|lose|loses|lost|miss|misses|missed|risk|risks|delay|delays|prevent|prevents|limits|limited|unpredictable|inconsistent|dependence|dependent|wasted|slower|harder|erodes|leaves|means|results in|leads to)\b/i;
const CONTRAST_MARKERS = /\b(not simply|not just|instead|rather than|works when|only works when|more than|before|first|the answer is|the better approach|should)\b/i;
const MECHANISM_MARKERS = /\b(by|through|starts with|begins with|reviews|analyzes|assesses|identifies|maps|organizes|connects|turns|compares|prioritizes|builds|creates|automates|coordinates|combines|shows|examines)\b/i;
const ROLE_MARKERS = /\b(owner|owners|operator|operators|manager|managers|director|directors|leader|leaders|decision-maker|decision-makers|executive|executives|practice administrator|practice administrators|founder|founders|principal|principals)\b/i;
const CUSTOMER_FIELD_VENDOR_MARKERS = /\b(marketing vip|web search professionals|our company|our agency|our platform|we need|we want|our issue|the user|form field|brand area|campaign creator)\b/i;
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

function ensureSentence(value: string) {
  const text = clean(value);
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function recordValue(record: unknown, keys: string[], maxLength = 1200) {
  if (!isRecord(record)) return "";

  for (const key of keys) {
    const value = clean(record[key], maxLength);
    if (value) return value;
  }

  return "";
}

function listValues(value: unknown, maxItems = 6) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const output: string[] = [];

  for (const item of values) {
    if (typeof item === "string" || typeof item === "number") {
      const text = clean(item, 600);
      if (text) output.push(text);
      continue;
    }

    if (isRecord(item)) {
      const text = recordValue(item, ["value", "text", "label", "name", "description"], 600);
      if (text) output.push(text);
    }
  }

  return Array.from(new Set(output.map((item) => item.toLowerCase()))).map(
    (normalized) => output.find((item) => item.toLowerCase() === normalized) ?? normalized,
  ).slice(0, maxItems);
}

function recordList(record: unknown, keys: string[], maxItems = 6) {
  if (!isRecord(record)) return [];

  for (const key of keys) {
    const values = listValues(record[key], maxItems);
    if (values.length) return values;
  }

  return [];
}

function strategyValue(campaign: OneOffPromptCampaign, key: string) {
  const value = campaign.strategy?.[key];
  return typeof value === "string" ? clean(value, 1600) : "";
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

function hasAnyPhrase(value: string, phrases: string[]) {
  const normalized = value.toLowerCase();
  return phrases.some((phrase) => normalized.includes(phrase));
}

function hasGenericPhrase(value: string) {
  return hasAnyPhrase(value, GENERIC_STRATEGY_PHRASES);
}

function hasMetaLanguage(value: string) {
  return hasAnyPhrase(value, META_LANGUAGE);
}

function looksMalformed(value: string) {
  const text = clean(value);
  if (!text) return true;

  return (
    /\b(\w+)\s+\1\b/i.test(text) ||
    /\s[,:;]\s*[.!?]?$/.test(text) ||
    /^(and|but|because|which|that)\b/i.test(text) ||
    /\bto to\b|\bthe the\b|\band and\b/i.test(text)
  );
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

export function buildCustomerCenteredStrategySource({
  campaign,
  intelligence,
}: {
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
}): CustomerCenteredStrategySource {
  const buyer = intelligence.selectedBuyerSegments[0];
  const offer = intelligence.selectedOffers[0];
  const service = intelligence.selectedServiceLines[0];

  const approvedProof = [
    strategyValue(campaign, "proofPoints"),
  ].filter(Boolean);

  return {
    primaryAudience: derivePrimaryAudience(campaign, intelligence),
    campaignTopic: clean(campaign.idea, 1200),
    campaignGoal: clean(campaign.goal, 900),
    campaignCta: clean(campaign.cta, 400),
    tone: clean(campaign.tone, 200) || "Clear, practical, confident",
    platforms: (campaign.platforms ?? []).map((item) => clean(item, 80)).filter(Boolean),
    buyerDescription: recordValue(buyer, ["description", "summary"], 1000),
    customerPainSignals: recordList(buyer, ["common_pains", "pain_points", "pains"], 6),
    customerDesiredOutcomes: recordList(
      buyer,
      ["desired_outcomes", "outcomes", "goals"],
      6,
    ),
    customerObjections: recordList(buyer, ["objections", "common_objections"], 6),
    offerName: recordValue(offer, ["name", "title", "label"], 300),
    offerDescription: recordValue(offer, ["description", "summary"], 1400),
    offerOutcome: recordValue(offer, ["primary_outcome", "outcome", "result"], 900),
    offerType: recordValue(offer, ["offer_type", "type"], 300),
    offerPriceNotes: recordValue(offer, ["price_notes", "pricing_notes", "price"], 500),
    offerCta: recordValue(offer, ["primary_cta", "cta"], 400),
    serviceName: recordValue(service, ["name", "title", "label"], 300),
    serviceDescription: recordValue(service, ["description", "summary"], 1400),
    serviceOutcome: recordValue(service, ["primary_outcome", "outcome", "result"], 900),
    approvedProof,
    internalDifferentiator: strategyValue(campaign, "differentiator"),
    internalOriginalityAngle: strategyValue(campaign, "originalityAngle"),
    creatorNotes: clean(campaign.notes, 1600),
  };
}

function displayList(values: string[]) {
  return values.length ? values.map((item) => `- ${item}`).join("\n") : "- Not specifically established";
}

export function formatCustomerCenteredStrategySource(
  source: CustomerCenteredStrategySource,
) {
  return [
    "## Customer-centered strategy source",
    "Use this as evidence and reasoning input, not as copy. Never reproduce internal field wording verbatim.",
    "",
    "### Customer context",
    `Primary decision-maker: ${source.primaryAudience}`,
    `Buyer description: ${source.buyerDescription || "Not specifically established"}`,
    "Customer pain signals:",
    displayList(source.customerPainSignals),
    "Customer desired outcomes:",
    displayList(source.customerDesiredOutcomes),
    "Customer objections:",
    displayList(source.customerObjections),
    "",
    "### Campaign intent",
    `Topic or idea: ${source.campaignTopic || "Not specifically established"}`,
    `Business objective: ${source.campaignGoal || "Not specifically established"}`,
    `CTA: ${source.campaignCta || source.offerCta || "Not specifically established"}`,
    `Tone: ${source.tone}`,
    "",
    "### Verified offer facts",
    `Offer name: ${source.offerName || "Not specifically established"}`,
    `Offer description: ${source.offerDescription || "Not specifically established"}`,
    `Offer outcome: ${source.offerOutcome || "Not specifically established"}`,
    `Offer type: ${source.offerType || "Not specifically established"}`,
    `Price or package note: ${source.offerPriceNotes || "Not specifically established"}`,
    `Offer CTA: ${source.offerCta || "Not specifically established"}`,
    "",
    "### Related service facts",
    `Service name: ${source.serviceName || "Not specifically established"}`,
    `Service description: ${source.serviceDescription || "Not specifically established"}`,
    `Service outcome: ${source.serviceOutcome || "Not specifically established"}`,
    "",
    "### Approved proof",
    displayList(source.approvedProof),
    "",
    "### Internal strategic guidance",
    `Differentiator to interpret, not quote: ${source.internalDifferentiator || "Not specifically established"}`,
    `Originality angle to interpret, not quote: ${source.internalOriginalityAngle || "Not specifically established"}`,
    `Creator notes to interpret, not quote: ${source.creatorNotes || "Not specifically established"}`,
  ].join("\n");
}

function sourceStrings(source: CustomerCenteredStrategySource) {
  return [
    source.buyerDescription,
    source.offerDescription,
    source.serviceDescription,
    source.internalDifferentiator,
    source.internalOriginalityAngle,
    source.creatorNotes,
  ]
    .map((item) => clean(item, 1800))
    .filter((item) => wordCount(item) >= 7);
}

function looksCopiedFromSource(
  value: string,
  source: CustomerCenteredStrategySource,
) {
  const normalized = clean(value).toLowerCase();
  if (!normalized || wordCount(value) < 8) return false;

  return sourceStrings(source).some((raw) => {
    const rawNormalized = raw.toLowerCase();
    return (
      (rawNormalized.length >= 70 && normalized.includes(rawNormalized)) ||
      similarity(value, raw) >= 0.88
    );
  });
}

function addIssue(
  issues: OneOffStrategyPrecisionIssue[],
  field: OneOffStrategyPrecisionIssue["field"],
  code: string,
  message: string,
) {
  if (issues.some((issue) => issue.field === field && issue.code === code)) return;
  issues.push({ field, code, message });
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
  const source = buildCustomerCenteredStrategySource({ campaign, intelligence });
  const fields = Object.entries(strategy) as Array<[
    keyof OneOffCampaignStrategy,
    string,
  ]>;

  for (const [field, value] of fields) {
    if (looksMalformed(value)) {
      addIssue(
        issues,
        field,
        "malformed_language",
        `${field} contains incomplete, duplicated, or non-logical language and must be rewritten as complete business English.`,
      );
    }

    if (
      !["messageProgression", "contentDirection"].includes(field) &&
      hasMetaLanguage(value)
    ) {
      addIssue(
        issues,
        field,
        "internal_prompt_language",
        `${field} exposes internal instructions, field labels, or planning language instead of a finished strategy statement.`,
      );
    }

    if (
      ![
        "offerDeliverables",
        "proofAndSupport",
        "objectionsAndResponse",
        "primaryCta",
        "messageProgression",
        "contentDirection",
      ].includes(field) &&
      looksCopiedFromSource(value, source)
    ) {
      addIssue(
        issues,
        field,
        "source_regurgitation",
        `${field} substantially repeats saved Brand Voice, Account Strategy, offer, service, or creator wording. Interpret the idea and write an original strategic conclusion.`,
      );
    }
  }

  if (
    looksLikeAudienceDump(strategy.targetAudience) ||
    wordCount(strategy.targetAudience) < 5 ||
    wordCount(strategy.targetAudience) > 48 ||
    !ROLE_MARKERS.test(strategy.targetAudience)
  ) {
    addIssue(
      issues,
      "targetAudience",
      "audience_not_prioritized",
      "Target audience must identify one primary decision-maker, the relevant business context, and no roster of industries or trades.",
    );
  }

  if (
    !MOMENT_MARKERS.test(strategy.buyerSituation) ||
    !CURRENT_BEHAVIOR_MARKERS.test(strategy.buyerSituation) ||
    wordCount(strategy.buyerSituation) < 28 ||
    wordCount(strategy.buyerSituation) > 105 ||
    CUSTOMER_FIELD_VENDOR_MARKERS.test(strategy.buyerSituation)
  ) {
    addIssue(
      issues,
      "buyerSituation",
      "buyer_situation_not_customer_moment",
      "Buyer situation must be a logical customer moment: trigger, current behavior or workaround, what has stopped working, and why the issue matters now. It must not describe the vendor's or campaign creator's situation.",
    );
  }

  if (
    wordCount(strategy.coreProblem) < 16 ||
    wordCount(strategy.coreProblem) > 75 ||
    !CAUSAL_MARKERS.test(strategy.coreProblem) ||
    CUSTOMER_FIELD_VENDOR_MARKERS.test(strategy.coreProblem)
  ) {
    addIssue(
      issues,
      "coreProblem",
      "core_problem_not_customer_cause",
      "Core problem must explain the customer's underlying causal obstacle—why the current approach fails—not the marketer's goal, the vendor's issue, or a restatement of the campaign idea.",
    );
  }

  if (
    wordCount(strategy.businessConsequence) < 16 ||
    wordCount(strategy.businessConsequence) > 75 ||
    !CONSEQUENCE_MARKERS.test(strategy.businessConsequence) ||
    CUSTOMER_FIELD_VENDOR_MARKERS.test(strategy.businessConsequence)
  ) {
    addIssue(
      issues,
      "businessConsequence",
      "business_consequence_not_downstream_effect",
      "Business consequence must explain what the customer loses, risks, delays, or cannot achieve if the problem continues. It must not simply restate the campaign goal or desired outcome.",
    );
  }

  if (
    wordCount(strategy.campaignObjective) < 14 ||
    hasGenericPhrase(strategy.campaignObjective)
  ) {
    addIssue(
      issues,
      "campaignObjective",
      "objective_not_decision_change",
      "Campaign objective must define the belief, decision, or commercial action the campaign should make more likely—not a generic growth statement.",
    );
  }

  if (
    wordCount(strategy.campaignPointOfView) < 18 ||
    hasGenericPhrase(strategy.campaignPointOfView) ||
    !CONTRAST_MARKERS.test(strategy.campaignPointOfView)
  ) {
    addIssue(
      issues,
      "campaignPointOfView",
      "point_of_view_not_distinctive",
      "Campaign point of view must state a specific belief about why the familiar approach falls short and what the customer should do differently.",
    );
  }

  if (
    wordCount(strategy.offerExplanation) < 22 ||
    wordCount(strategy.offerExplanation) > 110 ||
    !MECHANISM_MARKERS.test(strategy.offerExplanation) ||
    hasMetaLanguage(strategy.offerExplanation)
  ) {
    addIssue(
      issues,
      "offerExplanation",
      "offer_explanation_lacks_mechanism",
      "Offer explanation must describe how the offer works, what it examines or changes, and why that mechanism helps the customer make progress. It must not repeat the saved service description.",
    );
  }

  if (wordCount(strategy.offerDeliverables) < 8 || hasMetaLanguage(strategy.offerDeliverables)) {
    addIssue(
      issues,
      "offerDeliverables",
      "deliverables_not_concrete",
      "Offer deliverables must state exactly what the customer receives using only verified offer facts. When the saved offer does not define deliverables, say that clearly rather than inventing them.",
    );
  }

  if (wordCount(strategy.proofAndSupport) < 7 || hasMetaLanguage(strategy.proofAndSupport)) {
    addIssue(
      issues,
      "proofAndSupport",
      "proof_not_usable",
      "Proof and support must separate approved evidence from reasoning. Never turn a knowledge-source summary, desired outcome, or service description into proof.",
    );
  }

  if (wordCount(strategy.objectionsAndResponse) < 18 || hasMetaLanguage(strategy.objectionsAndResponse)) {
    addIssue(
      issues,
      "objectionsAndResponse",
      "objection_response_not_specific",
      "Objections and response must name a believable customer concern and answer it directly, honestly, and without pressure.",
    );
  }

  if (wordCount(strategy.messageProgression) < 28) {
    addIssue(
      issues,
      "messageProgression",
      "message_progression_not_argument",
      "Message progression must define a coherent persuasion sequence from customer moment to problem, consequence, point of view, offer, proof, and CTA.",
    );
  }

  if (
    !clean(strategy.primaryCta) ||
    wordCount(strategy.primaryCta) > 18 ||
    (source.campaignCta &&
      clean(strategy.primaryCta).toLowerCase() !==
        clean(source.campaignCta).toLowerCase())
  ) {
    addIssue(
      issues,
      "primaryCta",
      "cta_not_single_action",
      "Primary CTA must be one concise, specific next action.",
    );
  }

  if (
    wordCount(strategy.contentDirection) < 30 ||
    !/\b(blog|email|linkedin|facebook|video|youtube)\b/i.test(strategy.contentDirection)
  ) {
    addIssue(
      issues,
      "contentDirection",
      "channel_direction_not_distinct",
      "Channel direction must give each planned channel a distinct job rather than repeating one generic message everywhere.",
    );
  }

  const crossSectionPairs: Array<[
    keyof OneOffCampaignStrategy,
    keyof OneOffCampaignStrategy,
  ]> = [
    ["targetAudience", "buyerSituation"],
    ["buyerSituation", "coreProblem"],
    ["coreProblem", "businessConsequence"],
    ["campaignPointOfView", "offerExplanation"],
    ["offerExplanation", "offerDeliverables"],
  ];

  for (const [left, right] of crossSectionPairs) {
    if (similarity(strategy[left], strategy[right]) < 0.72) continue;
    addIssue(
      issues,
      "crossSection",
      `${left}_${right}_overlap`,
      `${left} and ${right} substantially repeat the same idea. Give each section its own strategic job.`,
    );
  }

  return issues;
}

function isMarketingContext(source: CustomerCenteredStrategySource) {
  return /\b(marketing|seo|search|content|social|visibility|lead|website|brand|advertis|ai|automation)\b/i.test(
    [
      source.campaignTopic,
      source.offerName,
      source.offerDescription,
      source.serviceName,
      source.serviceDescription,
    ].join(" "),
  );
}

function isAuditContext(source: CustomerCenteredStrategySource) {
  return /\b(audit|assessment|review|analysis|report|diagnostic)\b/i.test(
    [source.offerName, source.offerDescription, source.offerType, source.campaignTopic].join(" "),
  );
}

function isPlatformContext(source: CustomerCenteredStrategySource) {
  return /\b(platform|software|system|workspace|dashboard|automation|all-in-one|team in a box)\b/i.test(
    [source.offerName, source.offerDescription, source.serviceDescription].join(" "),
  );
}

function firstUseful(values: string[], fallback = "") {
  return values.map((item) => clean(item)).find(Boolean) ?? fallback;
}

function desiredOutcome(source: CustomerCenteredStrategySource) {
  return firstUseful(
    source.customerDesiredOutcomes,
    source.offerOutcome || source.serviceOutcome || source.campaignGoal || "a more dependable result",
  );
}

function customerPain(source: CustomerCenteredStrategySource) {
  return firstUseful(
    source.customerPainSignals,
    source.campaignTopic || "the current approach is no longer producing a dependable result",
  );
}

function currentWorkaround(source: CustomerCenteredStrategySource) {
  if (isMarketingContext(source)) {
    return "marketing is still being handled between customer work, referrals, and occasional bursts of activity";
  }

  return "the current process is still being managed reactively alongside day-to-day operations";
}

function buildBuyerSituation(source: CustomerCenteredStrategySource) {
  const pain = stripTrailingPunctuation(customerPain(source));
  const outcome = stripTrailingPunctuation(desiredOutcome(source));

  return [
    `The issue becomes urgent when ${currentWorkaround(source)}.`,
    `The decision-maker can see that ${lowerFirst(pain)}, and what once felt manageable is now making the desired outcome—${lowerFirst(outcome)}—harder to achieve.`,
    "That creates a practical reason to evaluate a more dependable approach now.",
  ].join(" ");
}

function buildCoreProblem(source: CustomerCenteredStrategySource) {
  if (isAuditContext(source)) {
    return "The underlying problem is not simply a lack of activity; it is the absence of a clear, evidence-based view of what is working, where performance is breaking down, and which gaps deserve attention first.";
  }

  if (isPlatformContext(source) && isMarketingContext(source)) {
    return "The underlying problem is that strategy, content production, execution, and measurement are fragmented across tools and spare time, so each activity happens in isolation instead of reinforcing a repeatable marketing system.";
  }

  if (isMarketingContext(source)) {
    return "The underlying problem is not a lack of effort; it is the absence of a repeatable process that connects audience insight, useful content, consistent execution, and measurement around one commercial objective.";
  }

  return `The underlying problem is that the current approach addresses visible symptoms reactively without resolving the process that keeps ${lowerFirst(stripTrailingPunctuation(customerPain(source)))} recurring.`;
}

function buildBusinessConsequence(source: CustomerCenteredStrategySource) {
  const outcome = stripTrailingPunctuation(desiredOutcome(source));

  if (isMarketingContext(source)) {
    return `When the problem continues, demand remains less predictable, opportunities are easier to miss, and the business stays more dependent on referrals or last-minute promotion instead of building a reliable path toward ${lowerFirst(outcome)}.`;
  }

  return `When the problem continues, the business loses time to reactive work, delays progress toward ${lowerFirst(outcome)}, and carries more operational risk because the underlying cause remains unresolved.`;
}

function buildCampaignObjective(source: CustomerCenteredStrategySource) {
  const offer = source.offerName || source.serviceName || "the proposed solution";
  const cta = source.campaignCta || source.offerCta || "take the approved next step";

  return `Move ${lowerFirst(source.primaryAudience)} from accepting the current problem as normal to seeing ${offer} as a practical way to address the cause, and make “${cta}” the next logical action.`;
}

function buildPointOfView(source: CustomerCenteredStrategySource) {
  if (isAuditContext(source)) {
    return "The first step is not to add more activity or spend more money; it is to see the current situation clearly, identify the gaps that matter, and make the next decision from evidence rather than assumption.";
  }

  if (isPlatformContext(source) && isMarketingContext(source)) {
    return "The answer is not simply to produce more content. Marketing becomes useful when strategy, production, publishing, and measurement operate as one connected system instead of a collection of disconnected tasks.";
  }

  if (isMarketingContext(source)) {
    return "More marketing activity is not automatically better. The better approach is to connect each message and channel to one audience problem, one useful point of view, and one measurable next step.";
  }

  return "The better approach is to diagnose the cause before adding more activity, then use a repeatable process that addresses the problem in the order the customer actually experiences it.";
}

function buildOfferExplanation(source: CustomerCenteredStrategySource) {
  const offer = source.offerName || source.serviceName || "The offer";
  const description = stripTrailingPunctuation(
    source.offerDescription || source.serviceDescription,
  );
  const outcome = stripTrailingPunctuation(
    source.offerOutcome || source.serviceOutcome || desiredOutcome(source),
  );

  if (isAuditContext(source)) {
    const scopeSentence = source.offerDescription
      .split(/(?<=[.!?])\s+/)
      .find(
        (sentence) =>
          !/\b(report|page|pages|plan|recommendation|checklist|deliverable|buyer receives|customer receives)\b/i.test(
            sentence,
          ),
      );
    const scope = stripTrailingPunctuation(scopeSentence || description)
      .replace(
        /^(a|an|the)\s+(complimentary\s+|free\s+)?(visibility\s+)?(audit|assessment|review|analysis)\s+(that\s+|which\s+)?/i,
        "",
      )
      .replace(/^examines?\s+/i, "");
    const subject = scope
      ? lowerFirst(scope)
      : "the customer's current position, visible gaps, and priority opportunities";
    return `${offer} examines ${subject}, then organizes the findings around what is working, what is missing, and what deserves attention first. This gives the buyer a decision-ready view before committing to a larger change or investment.`;
  }

  if (isPlatformContext(source) && isMarketingContext(source)) {
    return `${offer} connects strategy, content planning, asset creation, execution support, and measurement in one workflow. By keeping those stages connected, it turns scattered marketing tasks into a repeatable operating process designed to support ${lowerFirst(outcome)}.`;
  }

  if (description) {
    return `${offer} works by ${lowerFirst(description)}. The value is not the activity alone; it is the way that process helps the customer move toward ${lowerFirst(outcome)} with a clearer sequence and less guesswork.`;
  }

  return `${offer} works by examining the current situation, identifying the highest-priority gap, and guiding the customer through a practical next step toward ${lowerFirst(outcome)}.`;
}

function buildOfferDeliverables(source: CustomerCenteredStrategySource) {
  const facts = [source.offerDescription, source.offerOutcome]
    .map((item) => clean(item))
    .filter(Boolean)
    .join(" ");
  const deliverableSentence = facts
    .split(/(?<=[.!?])\s+/)
    .find((sentence) =>
      /\b(report|page|pages|plan|recommendation|recommendations|checklist|calendar|assets|dashboard|summary|findings|roadmap|scorecard|document|documents)\b/i.test(
        sentence,
      ),
    );

  if (deliverableSentence) {
    return ensureSentence(deliverableSentence);
  }

  if (source.offerName && source.offerOutcome) {
    return `The buyer receives ${source.offerName} and the verified outcome described in the saved offer: ${lowerFirst(stripTrailingPunctuation(source.offerOutcome))}. Confirm any additional documents, files, meetings, or implementation support before approval.`;
  }

  return "The saved offer does not define a concrete deliverable list. Confirm exactly what the buyer receives before approving the strategy; do not invent a report, plan, meeting, or implementation step.";
}

function buildProofAndSupport(source: CustomerCenteredStrategySource) {
  if (source.approvedProof.length) {
    return `Approved support: ${source.approvedProof.join(" ")} Use the evidence only in its stated context; do not extend the result to audiences or outcomes that were not documented.`;
  }

  return "No approved quantitative proof or customer result has been supplied. Support the campaign with a clear explanation of the problem, the offer's verified process, and practical reasoning without implying unverified outcomes.";
}

function objectionResponse(objection: string, source: CustomerCenteredStrategySource) {
  const normalized = objection.toLowerCase();

  if (/busy|too much work|no time/.test(normalized)) {
    return `${objection} The response is that a repeatable system is most useful when the owner is already busy, because it reduces dependence on last-minute marketing rather than adding another unstructured task.`;
  }

  if (/price|cost|expensive|budget/.test(normalized)) {
    return `${objection} The response should focus on clarifying the scope, deliverables, and decision value first, so the buyer can judge the investment against the cost of continuing with a fragmented or uncertain approach.`;
  }

  if (/do not understand|don't understand|confus|not sure/.test(normalized)) {
    return `${objection} The response is to make the process visible in plain language: what will be examined, what the buyer will receive, and what decision the result is intended to support.`;
  }

  return `${objection} Respond by explaining the verified process, what the buyer receives, and the limited next-step commitment without pressure or unsupported promises.`;
}

function buildObjections(source: CustomerCenteredStrategySource) {
  const objection = firstUseful(
    source.customerObjections,
    strategyFallbackObjection(source),
  );
  return objectionResponse(ensureSentence(objection), source);
}

function strategyFallbackObjection(source: CustomerCenteredStrategySource) {
  if (isMarketingContext(source)) {
    return "The buyer may believe the current referral-driven or occasional approach is good enough because the business is already busy";
  }
  return "The buyer may hesitate because changing the current approach feels disruptive or difficult to evaluate";
}

function buildMessageProgression(source: CustomerCenteredStrategySource) {
  const offer = source.offerName || source.serviceName || "the offer";
  const cta = source.campaignCta || source.offerCta || "the approved next step";

  return [
    "1. Open with the recognizable customer moment and current workaround.",
    "2. Show why the visible frustration points to a deeper process problem.",
    "3. Explain the operational or commercial consequence of leaving it unresolved.",
    "4. Introduce the campaign's point of view and contrast it with the familiar approach.",
    `5. Explain how ${offer} works and what the customer receives.`,
    "6. Support the argument with approved evidence or transparent practical reasoning.",
    `7. Resolve the strongest objection and close with one action: ${cta}.`,
  ].join("\n");
}

function buildContentDirection(source: CustomerCenteredStrategySource) {
  const pointOfView = stripTrailingPunctuation(buildPointOfView(source));

  return [
    `Blog: teach the full argument, moving from the buyer's situation through the underlying cause, consequence, better approach, and offer mechanism.`,
    `Email: focus on one recognizable trigger and make the CTA feel like a low-friction next decision.`,
    `LinkedIn: lead with the professional point of view—${pointOfView}—and support it with practical reasoning.`,
    "Facebook: use a familiar everyday scenario, plain language, and a helpful explanation rather than a sales pitch.",
    "Video/YouTube: open with the buyer moment in the first few seconds, explain one memorable insight, show how the offer works, and end with one CTA.",
  ].join("\n");
}

function buildPrimaryCta(source: CustomerCenteredStrategySource) {
  return source.campaignCta || source.offerCta || "Take the approved next step";
}

function needsCustomerRewrite(value: string) {
  return looksMalformed(value) || hasMetaLanguage(value) || CUSTOMER_FIELD_VENDOR_MARKERS.test(value);
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
  const source = buildCustomerCenteredStrategySource({ campaign, intelligence });
  const issues = assessOneOffStrategyPrecision({ strategy, campaign, intelligence });
  const hasIssue = (field: keyof OneOffCampaignStrategy) =>
    issues.some(
      (issue) =>
        issue.field === field ||
        (issue.field === "crossSection" && issue.code.includes(String(field))),
    );

  const targetAudience = hasIssue("targetAudience")
    ? source.primaryAudience
    : stripTrailingPunctuation(strategy.targetAudience);

  const buyerSituation =
    hasIssue("buyerSituation") || needsCustomerRewrite(strategy.buyerSituation)
      ? buildBuyerSituation(source)
      : strategy.buyerSituation;

  const coreProblem =
    hasIssue("coreProblem") || needsCustomerRewrite(strategy.coreProblem)
      ? buildCoreProblem(source)
      : strategy.coreProblem;

  const businessConsequence =
    hasIssue("businessConsequence") || needsCustomerRewrite(strategy.businessConsequence)
      ? buildBusinessConsequence(source)
      : strategy.businessConsequence;

  const campaignObjective = hasIssue("campaignObjective")
    ? buildCampaignObjective(source)
    : strategy.campaignObjective;

  const campaignPointOfView = hasIssue("campaignPointOfView")
    ? buildPointOfView(source)
    : strategy.campaignPointOfView;

  const offerExplanation = hasIssue("offerExplanation")
    ? buildOfferExplanation(source)
    : strategy.offerExplanation;

  const offerDeliverables = hasIssue("offerDeliverables")
    ? buildOfferDeliverables(source)
    : strategy.offerDeliverables;

  const proofAndSupport = hasIssue("proofAndSupport")
    ? buildProofAndSupport(source)
    : strategy.proofAndSupport;

  const objectionsAndResponse = hasIssue("objectionsAndResponse")
    ? buildObjections(source)
    : strategy.objectionsAndResponse;

  const messageProgression = hasIssue("messageProgression")
    ? buildMessageProgression(source)
    : strategy.messageProgression;

  const primaryCta = hasIssue("primaryCta")
    ? buildPrimaryCta(source)
    : strategy.primaryCta;

  const contentDirection = hasIssue("contentDirection")
    ? buildContentDirection(source)
    : strategy.contentDirection;

  return {
    campaignObjective,
    targetAudience,
    buyerSituation,
    coreProblem,
    businessConsequence,
    campaignPointOfView,
    offerExplanation,
    offerDeliverables,
    proofAndSupport,
    objectionsAndResponse,
    messageProgression,
    primaryCta,
    contentDirection,
  };
}

export function formatStrategyPrecisionIssues(
  issues: OneOffStrategyPrecisionIssue[],
) {
  if (!issues.length) return "No precision issues detected.";

  const grouped = new Map<string, string[]>();
  for (const issue of issues) {
    const key = String(issue.field);
    grouped.set(key, [...(grouped.get(key) ?? []), issue.message]);
  }

  return Array.from(grouped.entries())
    .map(([field, messages], index) => `${index + 1}. ${field}: ${messages.join(" ")}`)
    .join("\n");
}

export function buildStrategyPrecisionSourceSnapshot({
  campaign,
  intelligence,
}: {
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
}) {
  return formatCustomerCenteredStrategySource(
    buildCustomerCenteredStrategySource({ campaign, intelligence }),
  );
}
