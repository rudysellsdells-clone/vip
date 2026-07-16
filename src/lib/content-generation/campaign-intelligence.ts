import {
  formatDigitalCloneContext,
  type DigitalCloneContext,
} from "@/lib/clone/context";
import type { OneOffPromptCampaign } from "@/lib/content-generation/one-off-campaign-brief";

type MemoryRecord = Record<string, unknown>;

type Confidence = "supported" | "inferred" | "missing";

export type CampaignIntelligenceField = {
  value: string;
  confidence: Confidence;
  sources: string[];
};

export type CampaignIntelligenceBrief = {
  audience: CampaignIntelligenceField;
  decisionMoment: CampaignIntelligenceField;
  visibleProblem: CampaignIntelligenceField;
  underlyingProblem: CampaignIntelligenceField;
  businessConsequence: CampaignIntelligenceField;
  currentAlternatives: CampaignIntelligenceField;
  uniquePointOfView: CampaignIntelligenceField;
  offerMechanism: CampaignIntelligenceField;
  offerDeliverables: CampaignIntelligenceField;
  approvedProof: CampaignIntelligenceField;
  primaryObjection: CampaignIntelligenceField;
  objectionResponse: CampaignIntelligenceField;
  desiredConclusion: CampaignIntelligenceField;
  callToAction: CampaignIntelligenceField;
  readinessScore: number;
  missingElements: string[];
};

export type CampaignIntelligenceContext = {
  enabled: boolean;
  brief: CampaignIntelligenceBrief;
  formattedBrief: string;
  formattedContext: string;
  selectedServiceLines: unknown[];
  selectedBuyerSegments: unknown[];
  selectedOffers: unknown[];
  selectedContentExamples: unknown[];
  selectedKnowledgeSources: unknown[];
  selectionSummary: {
    serviceLinesSelected: number;
    serviceLinesAvailable: number;
    buyerSegmentsSelected: number;
    buyerSegmentsAvailable: number;
    offersSelected: number;
    offersAvailable: number;
    contentExamplesSelected: number;
    contentExamplesAvailable: number;
    knowledgeSourcesSelected: number;
    knowledgeSourcesAvailable: number;
  };
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "also",
  "and",
  "are",
  "because",
  "been",
  "before",
  "being",
  "between",
  "book",
  "business",
  "businesses",
  "campaign",
  "can",
  "company",
  "companies",
  "conversation",
  "conversations",
  "content",
  "could",
  "detail",
  "details",
  "from",
  "have",
  "help",
  "into",
  "marketing",
  "more",
  "most",
  "need",
  "offer",
  "offers",
  "owner",
  "owners",
  "only",
  "other",
  "our",
  "review",
  "schedule",
  "service",
  "services",
  "should",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "through",
  "understand",
  "using",
  "very",
  "want",
  "website",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

function isRecord(value: unknown): value is MemoryRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clean(value: unknown, maxLength = 1600) {
  const text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return "";

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function cleanList(values: unknown, maxItems = 5) {
  if (!Array.isArray(values)) return [];

  return values.map((value) => clean(value, 300)).filter(Boolean).slice(0, maxItems);
}

function strategyText(campaign: OneOffPromptCampaign, key: string) {
  const value = campaign.strategy?.[key];
  return typeof value === "string" ? clean(value) : "";
}

function strategyId(campaign: OneOffPromptCampaign, key: string) {
  const value = campaign.strategy?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function joinUnique(values: Array<string | null | undefined>, separator = " ") {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of values) {
    const value = clean(raw);
    const normalized = value.toLowerCase();

    if (!value || seen.has(normalized)) continue;

    seen.add(normalized);
    output.push(value);
  }

  return output.join(separator);
}

function recordText(value: unknown, depth = 0): string {
  if (depth > 3 || value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return clean(value, 3000);
  }

  if (Array.isArray(value)) {
    return value.map((item) => recordText(item, depth + 1)).filter(Boolean).join(" ");
  }

  if (!isRecord(value)) return "";

  return Object.entries(value)
    .filter(([key]) => !["id", "user_id", "account_id", "created_at", "updated_at"].includes(key))
    .map(([, child]) => recordText(child, depth + 1))
    .filter(Boolean)
    .join(" ");
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((token) => token.replace(/^-+|-+$/g, ""))
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
    ),
  );
}

function campaignSearchText(campaign: OneOffPromptCampaign) {
  return joinUnique(
    [
      campaign.name,
      campaign.idea,
      campaign.buyer_segment,
      campaign.audience,
      campaign.goal,
      campaign.cta,
      campaign.notes,
      strategyText(campaign, "differentiator"),
      strategyText(campaign, "proofPoints"),
      strategyText(campaign, "originalityAngle"),
      strategyText(campaign, "objections"),
      strategyText(campaign, "strategyContext"),
      strategyText(campaign, "sourceContext"),
    ],
    "\n",
  );
}

function entityName(value: unknown) {
  if (!isRecord(value)) return "";

  return clean(value.name ?? value.title ?? value.label, 240);
}

function scoreRecord(record: unknown, queryText: string, queryTokens: string[]) {
  const text = recordText(record).toLowerCase();

  if (!text) return 0;

  let score = 0;
  const name = entityName(record).toLowerCase();

  if (name && queryText.toLowerCase().includes(name)) {
    score += 14;
  }

  for (const token of queryTokens) {
    if (text.includes(token)) score += name.includes(token) ? 4 : 1;
  }

  return score;
}

function selectRelevant(
  items: unknown[],
  campaign: OneOffPromptCampaign,
  maxItems: number,
  allowSingleFallback = true,
  preferredIds: string[] = [],
  minScore = 1,
) {
  const query = campaignSearchText(campaign);
  const tokens = tokenize(query);
  const preferred = items.filter(
    (item) => isRecord(item) && preferredIds.includes(clean(item.id, 100)),
  );
  if (preferred.length) {
    return preferred.slice(0, maxItems);
  }

  const preferredKeys = new Set(preferred.map((item) => recordText(item)));
  const ranked = items
    .filter((item) => !preferredKeys.has(recordText(item)))
    .map((item, index) => ({ item, index, score: scoreRecord(item, query, tokens) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const matched = ranked.filter((entry) => entry.score >= minScore).map((entry) => entry.item);
  const selected = [...preferred, ...matched].slice(0, maxItems);

  if (selected.length) {
    return selected;
  }

  if (allowSingleFallback && items.length === 1) {
    return items.slice(0, 1);
  }

  return [];
}

function profileString(profile: unknown, key: string) {
  if (!isRecord(profile)) return "";
  return clean(profile[key]);
}

function valuesFromRecords(records: unknown[], keys: string[], maxItems = 5) {
  const values: string[] = [];

  for (const row of records) {
    if (!isRecord(row)) continue;

    for (const key of keys) {
      const value = row[key];

      if (Array.isArray(value)) {
        values.push(...cleanList(value, maxItems));
      } else {
        const text = clean(value, 700);
        if (text) values.push(text);
      }
    }
  }

  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, maxItems);
}

function namedDescriptions(records: unknown[], maxItems = 3) {
  return records
    .filter(isRecord)
    .map((record) =>
      joinUnique(
        [
          clean(record.name ?? record.title, 220),
          clean(record.description, 700),
          clean(record.primary_outcome ?? record.outcome, 500),
        ],
        " — ",
      ),
    )
    .filter(Boolean)
    .slice(0, maxItems);
}

function field(
  value: string,
  sources: string[],
  confidence: Confidence = value ? "supported" : "missing",
): CampaignIntelligenceField {
  return {
    value: value || "Not explicitly established in the saved campaign or account context.",
    confidence: value ? confidence : "missing",
    sources: value ? sources : [],
  };
}

function inferDesiredConclusion(campaign: OneOffPromptCampaign) {
  const goal = clean(campaign.goal);
  const cta = clean(campaign.cta);

  if (goal && cta) {
    return `The audience should understand why the campaign topic matters, see the offer as a practical response, and view “${cta}” as a reasonable next step toward ${goal.toLowerCase()}.`;
  }

  if (cta) {
    return `The audience should understand the problem and view “${cta}” as a practical, low-friction next step.`;
  }

  return "";
}

function calculateReadiness(fields: Array<[string, CampaignIntelligenceField]>) {
  const supported = fields.filter(([, value]) => value.confidence === "supported").length;
  const inferred = fields.filter(([, value]) => value.confidence === "inferred").length;
  const total = fields.length || 1;
  const score = Math.round(((supported + inferred * 0.5) / total) * 100);
  const missingElements = fields
    .filter(([, value]) => value.confidence === "missing")
    .map(([name]) => name);

  return {
    score: Math.max(0, Math.min(100, score)),
    missingElements,
  };
}

function formatField(label: string, value: CampaignIntelligenceField) {
  const sourceText = value.sources.length ? ` Sources: ${value.sources.join(", ")}.` : "";
  return `- ${label} [${value.confidence}]: ${value.value}${sourceText}`;
}

export function formatCampaignIntelligenceBrief(brief: CampaignIntelligenceBrief) {
  return [
    "## Private Campaign Intelligence Brief — H1.8A",
    "This brief is private planning guidance. Never quote its labels, confidence markers, missing-data notices, or source names in public-facing content.",
    "Supported fields may be treated as source material. Inferred fields are strategic bridges, not factual proof. Missing fields are not permission to invent specifics.",
    "The public assets should turn this brief into a coherent argument: recognizable situation, meaningful problem, business consequence, distinctive point of view, clear offer mechanism, objection response, desired conclusion, and natural CTA.",
    "",
    formatField("Audience", brief.audience),
    formatField("Decision moment", brief.decisionMoment),
    formatField("Visible problem", brief.visibleProblem),
    formatField("Underlying problem", brief.underlyingProblem),
    formatField("Business consequence", brief.businessConsequence),
    formatField("Current alternatives", brief.currentAlternatives),
    formatField("Unique point of view", brief.uniquePointOfView),
    formatField("Offer mechanism", brief.offerMechanism),
    formatField("Offer deliverables", brief.offerDeliverables),
    formatField("Approved proof", brief.approvedProof),
    formatField("Primary objection", brief.primaryObjection),
    formatField("Objection response", brief.objectionResponse),
    formatField("Desired conclusion", brief.desiredConclusion),
    formatField("Call to action", brief.callToAction),
    "",
    `Readiness score: ${brief.readinessScore}/100`,
    brief.missingElements.length
      ? `Unresolved elements: ${brief.missingElements.join(", ")}. Handle these with honest general language or realistic scenario framing; do not manufacture proof or deliverables.`
      : "Unresolved elements: none detected from the available campaign and account context.",
  ].join("\n");
}

export function buildCampaignIntelligenceContext({
  campaign,
  cloneContext,
  enabled = true,
}: {
  campaign: OneOffPromptCampaign;
  cloneContext: DigitalCloneContext;
  enabled?: boolean;
}): CampaignIntelligenceContext {
  const selectedBuyerSegments = enabled
    ? selectRelevant(cloneContext.buyerSegments, campaign, 2)
    : cloneContext.buyerSegments;
  const selectedOffers = enabled
    ? selectRelevant(
        cloneContext.offers,
        campaign,
        3,
        true,
        [strategyId(campaign, "offerId")].filter(Boolean),
      )
    : cloneContext.offers;
  const selectedServiceLines = enabled
    ? selectRelevant(
        cloneContext.serviceLines,
        campaign,
        3,
        true,
        [strategyId(campaign, "serviceLineId")].filter(Boolean),
      )
    : cloneContext.serviceLines;
  const selectedContentExamples = enabled
    ? selectRelevant(cloneContext.contentExamples, campaign, 3, false, [], 2)
    : cloneContext.contentExamples;
  const selectedKnowledgeSources = enabled
    ? selectRelevant(cloneContext.knowledgeSources, campaign, 5, false, [], 2)
    : cloneContext.knowledgeSources;

  const buyerDetails = namedDescriptions(selectedBuyerSegments, 2);
  const buyerPains = valuesFromRecords(selectedBuyerSegments, ["common_pains"], 5);
  const buyerOutcomes = valuesFromRecords(selectedBuyerSegments, ["desired_outcomes"], 5);
  const buyerObjections = valuesFromRecords(selectedBuyerSegments, ["objections"], 5);
  const offerDetails = namedDescriptions(selectedOffers, 3);
  const offerMechanics = valuesFromRecords(
    selectedOffers,
    ["description", "outcome", "offer_type", "price_notes"],
    7,
  );
  const offerCtas = valuesFromRecords(selectedOffers, ["primary_cta"], 3);
  const serviceDetails = namedDescriptions(selectedServiceLines, 3);
  const knowledgeSupport = valuesFromRecords(
    selectedKnowledgeSources,
    ["summary", "title"],
    5,
  );

  const explicitAudience = joinUnique([
    campaign.audience,
    campaign.buyer_segment,
    ...buyerDetails,
    profileString(cloneContext.accountBrandProfile, "target_audience"),
    profileString(cloneContext.profile, "audience_summary"),
  ], " | ");

  const visibleProblem = joinUnique([
    campaign.idea,
    ...buyerPains,
    campaign.notes,
  ], " | ");

  const underlyingProblem = joinUnique([
    strategyText(campaign, "strategyContext"),
    strategyText(campaign, "sourceContext"),
    strategyText(campaign, "differentiator"),
    ...serviceDetails,
  ], " | ");

  const businessConsequence = joinUnique([
    campaign.goal,
    ...buyerOutcomes,
    profileString(cloneContext.profile, "sales_outcome_summary"),
  ], " | ");

  const currentAlternatives = joinUnique([
    strategyText(campaign, "objections"),
    ...buyerObjections,
  ], " | ");

  const uniquePointOfView = joinUnique([
    strategyText(campaign, "originalityAngle"),
    strategyText(campaign, "differentiator"),
    ...serviceDetails,
  ], " | ");

  const offerMechanism = joinUnique([
    ...offerDetails,
    ...offerMechanics,
    profileString(cloneContext.accountBrandProfile, "core_offers"),
    profileString(cloneContext.profile, "offer_summary"),
  ], " | ");

  const offerDeliverables = joinUnique([
    ...offerMechanics,
    strategyText(campaign, "sourceContext"),
    strategyText(campaign, "proofPoints"),
  ], " | ");

  const approvedProof = joinUnique([
    strategyText(campaign, "proofPoints"),
    ...knowledgeSupport,
  ], " | ");

  const objectionResponse = joinUnique([
    strategyText(campaign, "differentiator"),
    strategyText(campaign, "proofPoints"),
    strategyText(campaign, "sourceContext"),
  ], " | ");

  const decisionMomentValue = campaign.notes
    ? clean(campaign.notes)
    : campaign.idea
      ? `Use a realistic moment when ${clean(campaign.idea, 700).replace(/[.!?]+$/, "").toLowerCase()} becomes important to the selected audience. Keep the scenario general unless account memory supplies a specific fact.`
      : "";

  const fieldsForReadiness: Array<[string, CampaignIntelligenceField]> = [
    ["audience", field(explicitAudience, ["campaign", "selected buyer memory", "brand profile"])],
    ["visible problem", field(visibleProblem, ["campaign idea", "campaign notes", "selected buyer memory"])],
    ["unique point of view", field(uniquePointOfView, ["campaign strategy", "selected service memory"])],
    ["offer mechanism", field(offerMechanism, ["selected offer memory", "brand profile"])],
    ["approved proof", field(approvedProof, ["campaign proof points", "selected knowledge memory"])],
    ["primary objection", field(currentAlternatives, ["campaign objections", "selected buyer memory"])],
    ["call to action", field(joinUnique([campaign.cta, ...offerCtas]), ["campaign CTA", "selected offer memory"])],
  ];

  const readiness = calculateReadiness(fieldsForReadiness);

  const brief: CampaignIntelligenceBrief = {
    audience: fieldsForReadiness[0][1],
    decisionMoment: field(
      decisionMomentValue,
      campaign.notes ? ["campaign notes"] : ["campaign idea"],
      campaign.notes ? "supported" : decisionMomentValue ? "inferred" : "missing",
    ),
    visibleProblem: fieldsForReadiness[1][1],
    underlyingProblem: field(underlyingProblem, ["campaign strategy", "selected service memory"]),
    businessConsequence: field(businessConsequence, ["campaign goal", "selected buyer memory", "clone profile"]),
    currentAlternatives: field(currentAlternatives, ["campaign objections", "selected buyer memory"]),
    uniquePointOfView: fieldsForReadiness[2][1],
    offerMechanism: fieldsForReadiness[3][1],
    offerDeliverables: field(offerDeliverables, ["selected offer memory", "campaign context"]),
    approvedProof: fieldsForReadiness[4][1],
    primaryObjection: fieldsForReadiness[5][1],
    objectionResponse: field(objectionResponse, ["campaign strategy", "campaign proof points"]),
    desiredConclusion: field(
      inferDesiredConclusion(campaign),
      ["campaign goal", "campaign CTA"],
      inferDesiredConclusion(campaign) ? "inferred" : "missing",
    ),
    callToAction: fieldsForReadiness[6][1],
    readinessScore: readiness.score,
    missingElements: readiness.missingElements,
  };

  const formattedContext = formatDigitalCloneContext({
    profile: cloneContext.profile,
    accountBrandProfile: cloneContext.accountBrandProfile,
    brandRules: cloneContext.brandRules,
    contentExamples: selectedContentExamples,
    knowledgeSources: selectedKnowledgeSources,
    serviceLines: selectedServiceLines,
    buyerSegments: selectedBuyerSegments,
    offers: selectedOffers,
  });

  return {
    enabled,
    brief,
    formattedBrief: formatCampaignIntelligenceBrief(brief),
    formattedContext: enabled
      ? formattedContext || "No campaign-relevant digital clone memory was selected for this brief."
      : cloneContext.formattedContext || formattedContext,
    selectedServiceLines,
    selectedBuyerSegments,
    selectedOffers,
    selectedContentExamples,
    selectedKnowledgeSources,
    selectionSummary: {
      serviceLinesSelected: selectedServiceLines.length,
      serviceLinesAvailable: cloneContext.serviceLines.length,
      buyerSegmentsSelected: selectedBuyerSegments.length,
      buyerSegmentsAvailable: cloneContext.buyerSegments.length,
      offersSelected: selectedOffers.length,
      offersAvailable: cloneContext.offers.length,
      contentExamplesSelected: selectedContentExamples.length,
      contentExamplesAvailable: cloneContext.contentExamples.length,
      knowledgeSourcesSelected: selectedKnowledgeSources.length,
      knowledgeSourcesAvailable: cloneContext.knowledgeSources.length,
    },
  };
}
