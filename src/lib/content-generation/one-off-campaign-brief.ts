import { buildAudiencePerspectivePrompt } from "@/lib/content-generation/audience-perspective";
import { buildCampaignDetailPromptSection } from "@/lib/content-generation/campaign-detail";

export type OneOffPromptCampaign = {
  name: string;
  idea: string;
  buyer_segment: string | null;
  audience: string | null;
  goal: string | null;
  platforms: string[] | null;
  tone: string | null;
  cta: string | null;
  notes: string | null;
  strategy?: Record<string, unknown> | null;
};

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getStrategyString(strategy: Record<string, unknown> | null | undefined, key: string) {
  const value = strategy?.[key];

  if (typeof value !== "string") return "";

  return clean(value);
}

function block(title: string, value: unknown) {
  const cleaned = clean(value);

  if (!cleaned) return "";

  return [`### ${title}`, cleaned].join("\n");
}

function compactSections(sections: string[]) {
  return sections.filter(Boolean).join("\n\n");
}

function userBriefHasDetail(campaign: OneOffPromptCampaign) {
  const strategy = campaign.strategy ?? null;
  const combined = [
    campaign.idea,
    campaign.notes,
    getStrategyString(strategy, "differentiator"),
    getStrategyString(strategy, "proofPoints"),
    getStrategyString(strategy, "originalityAngle"),
    getStrategyString(strategy, "objections"),
    getStrategyString(strategy, "strategyContext"),
    getStrategyString(strategy, "sourceContext"),
  ]
    .map(clean)
    .filter(Boolean)
    .join("\n\n");

  return combined.length >= 220 || /core message|core messages|must include|specific|detail|details|audit looks at|recommendations|owners understand/i.test(combined);
}

export function buildOneOffCampaignControlBriefSection(campaign: OneOffPromptCampaign) {
  const strategy = campaign.strategy ?? null;

  const sections = compactSections([
    block("Campaign idea", campaign.idea),
    block("User notes / direct instructions", campaign.notes),
    block("Differentiator", getStrategyString(strategy, "differentiator")),
    block("Proof points", getStrategyString(strategy, "proofPoints")),
    block("Originality angle", getStrategyString(strategy, "originalityAngle")),
    block("Objections to address", getStrategyString(strategy, "objections")),
    block("Selected strategy context", getStrategyString(strategy, "strategyContext")),
    block("Source / knowledge context", getStrategyString(strategy, "sourceContext")),
  ]);

  return [
    "## One-Off Campaign Control Brief — Highest Priority",
    "This private section defines the strategy source material for the asset pack. Do not quote this section or its labels in the output.",
    "The meaning of these inputs must shape the assets, but the wording must not be copied into public-facing content unless it is an exact offer name, CTA, proper noun, approved tagline, or clearly marked quote.",
    "If the user supplied detailed notes, core messages, proof points, objections, or source context, the assets must reflect those ideas directly and specifically.",
    "Do not bury the user's instructions under generic brand memory. Brand memory supports the brief; it does not replace it.",
    "",
    sections || "No detailed one-off control brief was supplied beyond the basic campaign fields.",
  ].join("\n");
}

export function buildOneOffCampaignExecutionContractSection(campaign: OneOffPromptCampaign) {
  const hasDetail = userBriefHasDetail(campaign);

  return [
    "## One-Off Campaign Execution Contract",
    "This asset pack must be written from the user's campaign inputs, not from generic marketing templates.",
    "Use the campaign fields this way:",
    "- Campaign idea = the topic and argument to develop.",
    "- User notes / direct instructions = highest-priority creative and strategic direction.",
    "- Differentiator = why this offer is meaningfully different.",
    "- Proof points = context to support the argument without inventing claims.",
    "- Objections = concerns the copy should answer in plain language.",
    "- CTA = the next step to make feel practical and safe.",
    "",
    "Public copy rules:",
    "- Do not write sentences that sound like form fields were stitched together.",
    "- Do not print labels such as core messages, proof points, objections, strategy context, source context, buyer segment, or campaign idea.",
    "- Do not say this campaign, this asset pack, this content, this post, the reader should, or the buyer needs.",
    "- Do not repeat any private instruction from this prompt inside campaignStrategy, audienceAngle, coreMessage, or public assets.",
    "- Rewrite every source idea into original everyday language for the final audience.",
    "- Every public-facing asset must lead from a real problem to a practical insight to a natural next step.",
    "- The final reader should understand what is being offered, why it matters, what it helps clarify, and why the next step is reasonable.",
    hasDetail
      ? "- Because the user supplied detailed direction, every public-facing asset must include campaign-specific substance from that direction. Do not return generic visibility, SEO, AI, or marketing copy."
      : "- If the brief is thin, safely infer practical detail from the audience, offer, and business context without inventing specific proof.",
  ].join("\n");
}

export function buildOneOffCampaignPerspectiveSections(campaign: OneOffPromptCampaign) {
  const audience = campaign.audience ?? campaign.buyer_segment;

  return [
    buildAudiencePerspectivePrompt({
      audience,
      topic: campaign.idea,
      offer: campaign.cta,
    }),
    buildCampaignDetailPromptSection({
      audience,
      topic: campaign.idea,
      offer: campaign.cta,
      objective: campaign.goal,
      businessContext: campaign.notes,
      differentiator: campaign.strategy?.differentiator,
      proofPoints: campaign.strategy?.proofPoints,
      objections: campaign.strategy?.objections,
    }),
    buildOneOffCampaignControlBriefSection(campaign),
    buildOneOffCampaignExecutionContractSection(campaign),
  ].join("\n\n");
}
