type PromptCampaign = {
  name: string;
  idea: string;
  buyer_segment: string | null;
  audience: string | null;
  goal: string | null;
  platforms: string[] | null;
  tone: string | null;
  cta: string | null;
  notes: string | null;
};

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

Safety rules:
- Do not claim anything that is not supported by the provided context.
- Do not create legal, medical, or financial guarantees.
- Do not imply any action has been sent, posted, published, or launched.
- All external actions require Rudy's approval.

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

## Rudy Digital Clone Memory
${cloneMemory}

${serviceLines}

${buyerSegments}

${offers}

## Output Requirements
1. Make this sound like Rudy, not generic AI.
2. Tie the campaign to revenue, leads, visibility, or qualified conversations.
3. Use the buyer segment's likely pain points.
4. Keep the email useful and ready to review.
5. Keep the LinkedIn and Facebook posts publish-ready but still approval-gated.
6. Make the YouTube metadata clear and search-friendly.
7. Make the short video script practical and easy to record.
8. Make the GalaxyAI prompt visual and specific.
9. Include an approval checklist that helps Rudy decide whether the campaign is safe and useful.

Return only valid JSON.`;
}

export function formatCampaignStrategyForAsset(strategy: unknown) {
  if (typeof strategy === "string") {
    return strategy;
  }

  return JSON.stringify(strategy, null, 2);
}
