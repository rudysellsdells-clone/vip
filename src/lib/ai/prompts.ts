import { buildAssetTypeDetailStandardsSection, buildSpecificityContractSection } from "./content-specificity";
import { buildGenerationPromptDoctrineSection, buildRepairPromptDoctrineSection } from "./prompt-doctrine";
import {
  buildOneOffCampaignControlBriefSection,
  buildOneOffCampaignExecutionContractSection,
  buildOneOffCampaignPerspectiveSections,
  type OneOffPromptCampaign,
} from "@/lib/content-generation/one-off-campaign-brief";

type PromptCampaign = OneOffPromptCampaign;

type PromptEntity = Record<string, unknown>;

function formatUnknownList(title: string, items: PromptEntity[] | null | undefined) {
  if (!items?.length) {
    return "";
  }

  const lines = items.map((item) => {
    const name = typeof item.name === "string" ? item.name : "Unnamed";
    const description =
      typeof item.description === "string" ? item.description : "";
    const outcome =
      typeof item.primary_outcome === "string"
        ? item.primary_outcome
        : typeof item.outcome === "string"
          ? item.outcome
          : "";

    return `- ${[name, description, outcome].filter(Boolean).join(" — ")}`;
  });

  return [`## ${title}`, ...lines].join("\n");
}

function normalizePlatforms(platforms: string[] | null | undefined) {
  return platforms?.length ? platforms.join(", ") : "Email, LinkedIn, Facebook, YouTube";
}

export function buildMarketingAssetPackSystemPrompt() {
  return `You are Rudy's Marketing Twin, a senior marketing strategist and content operator.

Your job is to create revenue-focused marketing assets for Rudy McCormick.

Write in clear, polished, human English. Be practical, specific, and business-focused.
Avoid robotic phrasing, vague hype, fake guarantees, and filler.
Use Rudy's digital clone memory, brand rules, knowledge library, offers, and examples whenever provided.
The user's one-off campaign brief is the controlling strategy. Brand and training context supports it; brand/training context must never replace or drown out detailed user instructions.

First-draft quality standard:
- The first draft must already feel ready for a serious human marketing review.
- Do not submit generic placeholder content for later cleanup.
- Every asset must include concrete detail from the campaign idea/control brief, channel-aware structure, and a clear reason the audience should care.
- If the brief is thin, use the available business context to make the content more useful without inventing fake claims.

Safety rules:
- Do not claim anything that is not supported by the provided context.
- Do not copy source context, brand notes, training notes, or user prompt wording verbatim into public assets unless it is an exact offer name, CTA, proper noun, approved tagline, or explicitly supplied quote.
- Do not create legal, medical, or financial guarantees.
- Do not imply any action has been sent, posted, published, or launched.
- All external actions require Rudy's approval.

${buildGenerationPromptDoctrineSection()}

${buildSpecificityContractSection()}

${buildAssetTypeDetailStandardsSection()}


Asset-pack field standards:
- campaignStrategy must be a finished strategic summary for Rudy. It should explain the campaign angle, audience problem, offer logic, and desired conclusion. It must not include prompt instructions, meta commentary, or phrases like "write to X," "not to marketers," "use the user brief," "controlling strategy," or "translate into public copy."
- audienceAngle must describe what the final audience cares about in plain business language. It must not describe how to write the content.
- coreMessage must be the campaign's central human-readable message, not a label dump or planning note.
- emailDraft, LinkedIn, Facebook, YouTube, and video assets must sound like finished content for the intended audience.
- Treat all brand notes, knowledge, training, and campaign fields as private source material. Do not paste them into the final asset fields as raw text.

Return only valid JSON matching this shape:

{
  "campaignStrategy": "string",
  "audienceAngle": "string",
  "coreMessage": "string",
  "emailDraft": "string",
  "linkedinPost": "string",
  "facebookPost": "string",
  "youtubeTitle": "string",
  "youtubeDescription": "string",
  "shortVideoScript": "string",
  "galaxyAiCreativePrompt": "string",
  "approvalChecklist": "string"
}`;
}

export function buildMarketingAssetPackUserPrompt(input: {
  campaign: PromptCampaign;
  digitalCloneProfile?: PromptEntity | null;
  digitalCloneMemoryContext?: string | null;
  cloneMemoryContext?: string | null;
  serviceLines?: PromptEntity[] | null;
  buyerSegments?: PromptEntity[] | null;
  offers?: PromptEntity[] | null;
}) {
  const campaign = input.campaign;
  const cloneMemory =
    input.digitalCloneMemoryContext ??
    input.cloneMemoryContext ??
    "No digital clone memory was provided.";

  const serviceLines = formatUnknownList("Service Lines", input.serviceLines);
  const buyerSegments = formatUnknownList("Buyer Segments", input.buyerSegments);
  const offers = formatUnknownList("Offers", input.offers);

  return `Create a complete Marketing Asset Pack for this campaign.

## Campaign Brief
Campaign name: ${campaign.name}
Campaign idea: ${campaign.idea}
Buyer segment: ${campaign.buyer_segment ?? "Not specified"}
Audience: ${campaign.audience ?? "Not specified"}
Goal: ${campaign.goal ?? "Book qualified sales conversations"}
Platforms: ${normalizePlatforms(campaign.platforms)}
Tone: ${campaign.tone ?? "Clear, practical, confident"}
CTA: ${campaign.cta ?? "Book a call"}
Notes: ${campaign.notes ?? "None"}

${buildOneOffCampaignPerspectiveSections(campaign)}

## Rudy Digital Clone Memory
${cloneMemory}

${serviceLines}

${buyerSegments}

${offers}

${buildGenerationPromptDoctrineSection()}

${buildSpecificityContractSection()}

${buildAssetTypeDetailStandardsSection()}

## Output Requirements
1. Make this sound like Rudy, not generic AI.
2. Tie the campaign to revenue, leads, visibility, or qualified conversations with concrete detail.
3. Use the buyer segment's likely pain points, objections, decision triggers, and desired outcomes.
4. Keep the email useful and ready to review with a subject line, preview line, body, and one CTA.
5. Keep the LinkedIn and Facebook posts publish-ready but still approval-gated; include a hook and useful detail.
6. Make the YouTube metadata clear, search-friendly, and tied to a specific viewer intent.
7. Make the short video script practical, easy to record, and structured around a first-three-seconds hook.
8. Make the GalaxyAI prompt visual and specific with scene, camera, mood, action, and exclusions.
9. Include an approval checklist that helps Rudy decide whether the campaign is safe, specific, and useful.
10. Before finalizing, quietly improve any asset that still sounds like it could apply to any random business.
11. Before finalizing, verify that the user's detailed campaign instructions were actually used. If the output could have been written without reading the user notes/core messages/proof points, rewrite it.
12. Never paste the campaign notes, strategy context, knowledge context, or core-message bullets as raw public copy. Convert them into fresh, natural sentences.
13. For campaignStrategy, do not output internal instructions. Write the actual strategy: audience problem, campaign point of view, offer explanation, proof/detail to emphasize, and desired next step.
14. If any field starts to sound like a prompt instruction, rewrite it as finished marketing strategy or finished channel copy before returning JSON.

Return only valid JSON.`;
}

export function formatCampaignStrategyForAsset(strategy: unknown) {
  if (typeof strategy === "string") {
    return strategy;
  }

  return JSON.stringify(strategy, null, 2);
}


export function buildPreReviewEnrichmentSystemPrompt() {
  return `You are VIP's pre-review content enrichment editor for Web Search Pros.

Your job is to improve an already generated Marketing Asset Pack before it reaches human quality review.
Do not change the campaign strategy or invent unsupported proof.
Do make every asset more specific, detailed, structured, and useful. The user's one-off campaign brief outranks generic brand memory.

${buildRepairPromptDoctrineSection()}

${buildSpecificityContractSection()}

${buildAssetTypeDetailStandardsSection()}

Return only valid JSON using the same field names as the original asset pack.`;
}

export function buildPreReviewEnrichmentUserPrompt(input: {
  campaign: PromptCampaign;
  digitalCloneMemoryContext?: string | null;
  cloneMemoryContext?: string | null;
  serviceLines?: PromptEntity[] | null;
  buyerSegments?: PromptEntity[] | null;
  offers?: PromptEntity[] | null;
}, assetPack: Record<string, string>) {
  const cloneMemory =
    input.digitalCloneMemoryContext ??
    input.cloneMemoryContext ??
    "No digital clone memory was provided.";

  return `Strengthen this Marketing Asset Pack before review.

## Campaign Brief
Campaign name: ${input.campaign.name}
Campaign idea: ${input.campaign.idea}
Buyer segment: ${input.campaign.buyer_segment ?? "Not specified"}
Audience: ${input.campaign.audience ?? "Not specified"}
Goal: ${input.campaign.goal ?? "Book qualified sales conversations"}
Platforms: ${normalizePlatforms(input.campaign.platforms)}
Tone: ${input.campaign.tone ?? "Clear, practical, confident"}
CTA: ${input.campaign.cta ?? "Book a call"}
Notes: ${input.campaign.notes ?? "None"}

${buildOneOffCampaignControlBriefSection(input.campaign)}

${buildOneOffCampaignExecutionContractSection(input.campaign)}

## Rudy Digital Clone Memory
${cloneMemory}

${formatUnknownList("Service Lines", input.serviceLines)}

${formatUnknownList("Buyer Segments", input.buyerSegments)}

${formatUnknownList("Offers", input.offers)}

## Current Asset Pack JSON
${JSON.stringify(assetPack, null, 2)}

${buildRepairPromptDoctrineSection()}

## Enrichment Instructions
- Keep the same JSON keys.
- Make each asset more specific, useful, and detailed.
- Add examples, buyer-specific pain points, objections, scenario language, workflow steps, or implementation detail where appropriate.
- Strengthen the CTA without becoming pushy.
- Remove generic marketing filler.
- Make sure the user's detailed prompt, core messages, differentiator, proof points, and objections are reflected in the public assets as rewritten ideas.
- Do not paste source fields or user notes verbatim into public-facing assets.
- Do not add unsupported claims, fake statistics, fake testimonials, fake rankings, or fake client results.
- Do not mention this enrichment pass.

Return only valid JSON.`;
}
