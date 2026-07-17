import { createHash } from "node:crypto";
import type {
  CampaignIntelligenceBrief,
  CampaignIntelligenceField,
} from "@/lib/content-generation/campaign-intelligence";
import {
  sanitizeCampaignNotesForPrompt,
  sanitizeOneOffCampaignStrategy,
} from "@/lib/content-generation/campaign-context-sanitizer";
import type { OneOffPromptCampaign } from "@/lib/content-generation/one-off-campaign-brief";

export const ONE_OFF_STRATEGY_GATE_VERSION = "h1.9" as const;
export const LEGACY_ONE_OFF_STRATEGY_GATE_VERSIONS = ["h1.8b"] as const;
export type OneOffStrategyGateVersion =
  | typeof ONE_OFF_STRATEGY_GATE_VERSION
  | (typeof LEGACY_ONE_OFF_STRATEGY_GATE_VERSIONS)[number];

export type OneOffStrategyStatus = "draft" | "approved";

export type OneOffCampaignStrategy = {
  campaignObjective: string;
  targetAudience: string;
  buyerSituation: string;
  coreProblem: string;
  businessConsequence: string;
  campaignPointOfView: string;
  offerExplanation: string;
  offerDeliverables: string;
  proofAndSupport: string;
  objectionsAndResponse: string;
  messageProgression: string;
  primaryCta: string;
  contentDirection: string;
};

export type OneOffStrategyGate = {
  version: OneOffStrategyGateVersion;
  status: OneOffStrategyStatus;
  sourceSignature: string;
  strategy: OneOffCampaignStrategy;
  generatedAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  generator: "openai" | "fallback" | "manual";
  intelligenceReadinessScore: number;
  intelligenceMissingElements: string[];
};

type CampaignRowLike = {
  name: string;
  idea: string;
  buyer_segment: string | null;
  audience: string | null;
  goal: string | null;
  platforms: string[] | null;
  tone: string | null;
  cta: string | null;
  promoted_offer?: string | null;
  notes: string | null;
  strategy?: unknown;
  service_line_id?: string | null;
  offer_id?: string | null;
};

type UnknownRecord = Record<string, unknown>;

const STRATEGY_FIELDS: Array<keyof OneOffCampaignStrategy> = [
  "campaignObjective",
  "targetAudience",
  "buyerSituation",
  "coreProblem",
  "businessConsequence",
  "campaignPointOfView",
  "offerExplanation",
  "offerDeliverables",
  "proofAndSupport",
  "objectionsAndResponse",
  "messageProgression",
  "primaryCta",
  "contentDirection",
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

function usableField(field: CampaignIntelligenceField | undefined) {
  if (!field || field.confidence === "missing") return "";
  return clean(field.value);
}

function firstUsable(...values: unknown[]) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }

  return "";
}

function storedStrategyRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

export function normalizeOneOffCampaignForPrompt(
  campaign: CampaignRowLike,
): OneOffPromptCampaign {
  const storedStrategy = storedStrategyRecord(campaign.strategy);
  const originalOneOffStrategy = isRecord(storedStrategy.oneOffCampaignStrategy)
    ? storedStrategy.oneOffCampaignStrategy
    : storedStrategy;
  const strategy = sanitizeOneOffCampaignStrategy(originalOneOffStrategy);

  return {
    name: campaign.name,
    idea: campaign.idea,
    buyer_segment: campaign.buyer_segment,
    audience: campaign.audience,
    goal: campaign.goal,
    platforms: campaign.platforms ?? [],
    tone: campaign.tone,
    cta: campaign.cta,
    promoted_offer: clean(campaign.promoted_offer ?? storedStrategy.promotedOffer) || null,
    notes: sanitizeCampaignNotesForPrompt(campaign.notes) || null,
    strategy,
  };
}

export function normalizeOneOffCampaignStrategy(
  value: unknown,
): OneOffCampaignStrategy {
  const record = isRecord(value) ? value : {};
  const strategy = {} as OneOffCampaignStrategy;

  for (const key of STRATEGY_FIELDS) {
    strategy[key] = clean(record[key]);
  }

  return strategy;
}

export function extractOneOffStrategyGate(value: unknown): OneOffStrategyGate | null {
  const root = storedStrategyRecord(value);
  const candidate = isRecord(root.oneOffStrategyGate)
    ? root.oneOffStrategyGate
    : null;

  const supportedVersions = new Set<string>([
    ONE_OFF_STRATEGY_GATE_VERSION,
    ...LEGACY_ONE_OFF_STRATEGY_GATE_VERSIONS,
  ]);
  if (!candidate || !supportedVersions.has(clean(candidate.version, 50))) {
    return null;
  }

  const status = candidate.status === "approved" ? "approved" : "draft";
  const strategy = normalizeOneOffCampaignStrategy(candidate.strategy);

  return {
    version: clean(candidate.version, 50) as OneOffStrategyGateVersion,
    status,
    sourceSignature: clean(candidate.sourceSignature, 200),
    strategy,
    generatedAt: clean(candidate.generatedAt, 100),
    updatedAt: clean(candidate.updatedAt, 100),
    approvedAt: clean(candidate.approvedAt, 100) || null,
    approvedBy: clean(candidate.approvedBy, 200) || null,
    generator:
      candidate.generator === "openai" || candidate.generator === "fallback"
        ? candidate.generator
        : "manual",
    intelligenceReadinessScore: Number.isFinite(
      Number(candidate.intelligenceReadinessScore),
    )
      ? Math.max(0, Math.min(100, Number(candidate.intelligenceReadinessScore)))
      : 0,
    intelligenceMissingElements: Array.isArray(
      candidate.intelligenceMissingElements,
    )
      ? candidate.intelligenceMissingElements.map((item) => clean(item, 200)).filter(Boolean)
      : [],
  };
}

export function mergeOneOffStrategyGate(
  existingStrategy: unknown,
  gate: OneOffStrategyGate,
) {
  return {
    ...storedStrategyRecord(existingStrategy),
    oneOffStrategyGate: gate,
  };
}

export function computeOneOffStrategySourceSignature(campaign: CampaignRowLike) {
  const normalized = normalizeOneOffCampaignForPrompt(campaign);
  const strategy = normalized.strategy ?? {};
  const storedRoot = storedStrategyRecord(campaign.strategy);
  const storedGate = isRecord(storedRoot.oneOffStrategyGate)
    ? storedRoot.oneOffStrategyGate
    : null;
  const legacySignature =
    storedGate?.version === "h1.8b" ||
    clean(strategy.workflowVersion, 50).startsWith("h1.8");
  const payload: Record<string, unknown> = {
    name: normalized.name,
    idea: normalized.idea,
    buyerSegment: normalized.buyer_segment,
    audience: normalized.audience,
    goal: normalized.goal,
    platforms: normalized.platforms,
    tone: normalized.tone,
    cta: normalized.cta,
    notes: normalized.notes,
    serviceLineId: campaign.service_line_id ?? strategy.serviceLineId ?? null,
    offerId: campaign.offer_id ?? strategy.offerId ?? null,
    differentiator: strategy.differentiator ?? null,
    proofPoints: strategy.proofPoints ?? null,
    originalityAngle: strategy.originalityAngle ?? null,
    objections: strategy.objections ?? null,
    strategyContext: strategy.strategyContext ?? null,
    sourceContext: strategy.sourceContext ?? null,
  };
  if (!legacySignature) payload.promotedOffer = normalized.promoted_offer;
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function oneOffStrategyMissingRequired(strategy: OneOffCampaignStrategy) {
  const required: Array<[keyof OneOffCampaignStrategy, string]> = [
    ["campaignObjective", "Campaign objective"],
    ["targetAudience", "Target audience"],
    ["coreProblem", "Core problem"],
    ["campaignPointOfView", "Campaign point of view"],
    ["offerExplanation", "Offer explanation"],
    ["primaryCta", "Primary CTA"],
  ];

  return required
    .filter(([key]) => !clean(strategy[key]))
    .map(([, label]) => label);
}

export function buildFallbackOneOffStrategy({
  campaign,
  brief,
}: {
  campaign: OneOffPromptCampaign;
  brief: CampaignIntelligenceBrief;
}): OneOffCampaignStrategy {
  const targetAudience = firstUsable(
    usableField(brief.audience),
    campaign.audience,
    campaign.buyer_segment,
  );
  const coreProblem = firstUsable(
    usableField(brief.visibleProblem),
    campaign.idea,
  );
  const offerExplanation = firstUsable(
    usableField(brief.offerMechanism),
    campaign.idea,
  );
  const primaryCta = firstUsable(usableField(brief.callToAction), campaign.cta);
  const pointOfView = firstUsable(
    usableField(brief.uniquePointOfView),
    campaign.strategy?.originalityAngle,
    campaign.strategy?.differentiator,
    campaign.idea,
  );

  return {
    campaignObjective: firstUsable(
      campaign.goal,
      usableField(brief.desiredConclusion),
      `Help ${targetAudience || "the intended audience"} understand the problem and evaluate the next step.`,
    ),
    targetAudience,
    buyerSituation: firstUsable(
      usableField(brief.decisionMoment),
      `The topic becomes relevant when ${coreProblem || "the current approach stops producing a dependable result"}.`,
    ),
    coreProblem,
    businessConsequence: firstUsable(
      usableField(brief.businessConsequence),
      "Explain the operational, financial, or opportunity cost without inventing a statistic.",
    ),
    campaignPointOfView: pointOfView,
    offerExplanation,
    offerDeliverables: firstUsable(
      usableField(brief.offerDeliverables),
      "Explain exactly what the buyer receives using only verified offer details.",
    ),
    proofAndSupport: firstUsable(
      usableField(brief.approvedProof),
      "No approved quantitative proof is available. Use practical explanation rather than unsupported claims.",
    ),
    objectionsAndResponse: firstUsable(
      [usableField(brief.primaryObjection), usableField(brief.objectionResponse)]
        .filter(Boolean)
        .join("\n\n"),
      usableField(brief.currentAlternatives),
      "Address the most likely hesitation honestly and without pressure.",
    ),
    messageProgression: [
      "Open with a recognizable buyer situation.",
      "Name the specific problem and why the usual approach falls short.",
      "Explain the business consequence.",
      "Introduce the campaign point of view and the offer mechanism.",
      "Support the argument with approved proof or practical detail.",
      `Close with the next step: ${primaryCta || "the approved CTA"}.`,
    ].join("\n"),
    primaryCta,
    contentDirection: [
      "Blog: fully explain the problem, consequence, better approach, and offer.",
      "Email: connect one buyer situation to one clear action.",
      "LinkedIn: lead with the campaign's professional point of view.",
      "Facebook: use an accessible, familiar scenario and practical explanation.",
      "Video: communicate one memorable idea with a fast hook and one CTA.",
    ].join("\n"),
  };
}

export function formatOneOffApprovedStrategyForPrompt(
  strategy: OneOffCampaignStrategy,
) {
  return [
    "## Approved One-Off Marketing Spine — H1.8B",
    "This is the approved source of truth for execution. Follow its argument and intent. Do not reopen strategy, substitute generic brand language, or copy these internal labels into public content.",
    `Campaign objective: ${strategy.campaignObjective}`,
    `Target audience: ${strategy.targetAudience}`,
    `Buyer situation: ${strategy.buyerSituation}`,
    `Core problem: ${strategy.coreProblem}`,
    `Business consequence: ${strategy.businessConsequence}`,
    `Campaign point of view: ${strategy.campaignPointOfView}`,
    `Offer explanation: ${strategy.offerExplanation}`,
    `Offer deliverables: ${strategy.offerDeliverables}`,
    `Proof and support: ${strategy.proofAndSupport}`,
    `Objections and response: ${strategy.objectionsAndResponse}`,
    `Message progression: ${strategy.messageProgression}`,
    `Primary CTA: ${strategy.primaryCta}`,
    `Content direction: ${strategy.contentDirection}`,
  ].join("\n");
}

export function formatVerifiedCampaignFacts(brief: CampaignIntelligenceBrief) {
  const rows: string[] = [];
  const supportedFields: Array<[string, CampaignIntelligenceField]> = [
    ["Audience source", brief.audience],
    ["Offer mechanism", brief.offerMechanism],
    ["Offer deliverables", brief.offerDeliverables],
    ["Approved proof", brief.approvedProof],
    ["Call to action", brief.callToAction],
  ];

  for (const [label, value] of supportedFields) {
    if (value.confidence !== "supported") continue;
    const text = clean(value.value);
    if (text) rows.push(`- ${label}: ${text}`);
  }

  return [
    "## Verified Campaign Facts",
    "These facts may support execution. They are evidence, not prewritten copy. Rewrite them naturally and do not print source labels.",
    ...(rows.length
      ? rows
      : ["- No additional verified facts were supplied beyond the approved strategy."]),
  ].join("\n");
}

export function approvedStrategySummary(strategy: OneOffCampaignStrategy) {
  return {
    campaignStrategy: [
      strategy.campaignObjective,
      strategy.campaignPointOfView,
      strategy.offerExplanation,
      strategy.messageProgression,
    ]
      .filter(Boolean)
      .join("\n\n"),
    audienceAngle: [strategy.targetAudience, strategy.buyerSituation, strategy.coreProblem]
      .filter(Boolean)
      .join("\n\n"),
    coreMessage: [
      strategy.campaignPointOfView,
      strategy.offerExplanation,
      strategy.primaryCta,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
