import type { OneOffCampaignStrategy } from "@/lib/content-generation/one-off-strategy-gate";

export type OneOffStrategyFieldDefinition = {
  key: keyof OneOffCampaignStrategy;
  label: string;
  helper: string;
  rows?: number;
};

export const ONE_OFF_STRATEGY_FIELDS: OneOffStrategyFieldDefinition[] = [
  {
    key: "campaignObjective",
    label: "Campaign objective",
    helper: "What this campaign should accomplish before the audience reaches the CTA.",
    rows: 3,
  },
  {
    key: "targetAudience",
    label: "Target audience",
    helper: "The actual decision-maker and relevant business situation—not a pasted industry list.",
    rows: 3,
  },
  {
    key: "buyerSituation",
    label: "Buyer situation",
    helper: "The recognizable moment when this campaign becomes relevant.",
    rows: 4,
  },
  {
    key: "coreProblem",
    label: "Core problem",
    helper: "The specific issue the audience is experiencing or overlooking.",
    rows: 4,
  },
  {
    key: "businessConsequence",
    label: "Business consequence",
    helper: "Why the problem matters operationally, financially, or competitively.",
    rows: 4,
  },
  {
    key: "campaignPointOfView",
    label: "Campaign point of view",
    helper: "The distinctive argument that should separate this campaign from generic advice.",
    rows: 5,
  },
  {
    key: "offerExplanation",
    label: "Offer explanation",
    helper: "What the offer does and why it is the logical response to the problem.",
    rows: 5,
  },
  {
    key: "offerDeliverables",
    label: "Offer deliverables",
    helper: "What the buyer receives, experiences, learns, or can decide afterward.",
    rows: 4,
  },
  {
    key: "proofAndSupport",
    label: "Proof and support",
    helper: "Only approved evidence, examples, facts, or honest practical support.",
    rows: 4,
  },
  {
    key: "objectionsAndResponse",
    label: "Objections and response",
    helper: "The strongest hesitation and the honest response the campaign should provide.",
    rows: 5,
  },
  {
    key: "messageProgression",
    label: "Message progression",
    helper: "The argument every asset should inherit from opening situation through CTA.",
    rows: 6,
  },
  {
    key: "primaryCta",
    label: "Primary CTA",
    helper: "The single next step the campaign should encourage.",
    rows: 3,
  },
  {
    key: "contentDirection",
    label: "Channel direction",
    helper: "How the blog, email, social posts, and video should each carry the strategy.",
    rows: 7,
  },
];

export const EMPTY_ONE_OFF_STRATEGY: OneOffCampaignStrategy = {
  campaignObjective: "",
  targetAudience: "",
  buyerSituation: "",
  coreProblem: "",
  businessConsequence: "",
  campaignPointOfView: "",
  offerExplanation: "",
  offerDeliverables: "",
  proofAndSupport: "",
  objectionsAndResponse: "",
  messageProgression: "",
  primaryCta: "",
  contentDirection: "",
};

export function countMissingOneOffStrategyFields(
  strategy: OneOffCampaignStrategy,
) {
  return [
    strategy.campaignObjective,
    strategy.targetAudience,
    strategy.coreProblem,
    strategy.campaignPointOfView,
    strategy.offerExplanation,
    strategy.primaryCta,
  ].filter((value) => !value.trim()).length;
}
