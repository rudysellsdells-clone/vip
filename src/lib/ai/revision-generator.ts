import { loadDigitalCloneContext } from "@/lib/clone/context";

type RevisionAsset = {
  id: string;
  asset_type: string;
  title: string | null;
  content: string;
  version: number;
};

type RevisionCampaign = {
  id: string;
  name: string;
  idea: string;
  buyer_segment: string | null;
  audience: string | null;
  goal: string | null;
  tone: string | null;
  cta: string | null;
  notes: string | null;
};

export type GenerateAssetRevisionInput = {
  userId: string;
  asset: RevisionAsset;
  campaign: RevisionCampaign | null;
  instructions: string;
};

export type GeneratedAssetRevision = {
  revisedTitle: string;
  revisedContent: string;
  revisionSummary: string;
  cloneMemorySnapshot: {
    profileLoaded: boolean;
    brandRuleCount: number;
    contentExampleCount: number;
    knowledgeSourceCount: number;
    serviceLineCount: number;
    buyerSegmentCount: number;
    offerCount: number;
    formattedContextPreview: string;
    generatedAt: string;
  };
};

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length ? value.trim() : fallback;
}

function extractJsonFromText(value: string) {
  const direct = safeJsonParse(value);

  if (direct) {
    return direct;
  }

  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return safeJsonParse(value.slice(firstBrace, lastBrace + 1));
}

function coerceRevision(value: unknown, fallbackTitle: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    revisedTitle: getString(record.revisedTitle, fallbackTitle),
    revisedContent: getString(record.revisedContent),
    revisionSummary: getString(record.revisionSummary, "Revised based on Rudy's instructions."),
  };
}

function buildSystemPrompt() {
  return `You are Rudy's Marketing Twin, a senior marketing strategist and editor.

Your job is to revise one approved or review-stage marketing asset.
Use Rudy's digital clone memory, brand rules, examples, offers, and knowledge library when provided.

Rules:
- Revise only the asset requested.
- Preserve the original asset type and intent.
- Follow Rudy's revision instructions carefully.
- Make the revised asset sound clear, human, practical, and specific.
- Do not claim the asset has been sent, posted, published, or executed.
- Do not include unsupported guarantees.
- Return only valid JSON.

JSON shape:
{
  "revisedTitle": "string",
  "revisedContent": "string",
  "revisionSummary": "string"
}`;
}

function buildUserPrompt(input: {
  asset: RevisionAsset;
  campaign: RevisionCampaign | null;
  instructions: string;
  cloneContext: string;
}) {
  return `Revise this single marketing asset.

## Revision Instructions
${input.instructions}

## Asset
Asset type: ${input.asset.asset_type}
Current title: ${input.asset.title ?? "Untitled asset"}
Current version: ${input.asset.version}

Current content:
${input.asset.content}

## Campaign Context
${input.campaign ? `Campaign name: ${input.campaign.name}
Campaign idea: ${input.campaign.idea}
Buyer segment: ${input.campaign.buyer_segment ?? "Not specified"}
Audience: ${input.campaign.audience ?? "Not specified"}
Goal: ${input.campaign.goal ?? "Not specified"}
Tone: ${input.campaign.tone ?? "Not specified"}
CTA: ${input.campaign.cta ?? "Not specified"}
Notes: ${input.campaign.notes ?? "None"}` : "No campaign context found."}

## Rudy Digital Clone Memory
${input.cloneContext || "No digital clone memory was provided."}

## Output
Return only valid JSON with revisedTitle, revisedContent, and revisionSummary.`;
}

function createFallbackRevision(input: {
  asset: RevisionAsset;
  instructions: string;
}): {
  revisedTitle: string;
  revisedContent: string;
  revisionSummary: string;
} {
  const title = input.asset.title ?? `${input.asset.asset_type} revision`;

  return {
    revisedTitle: `Revised: ${title}`,
    revisedContent: `${input.asset.content}

Revision note applied:
${input.instructions}

Cleaned-up direction:
Use this as the revised working version. Review for tone, specificity, CTA strength, and approval before any external action.`,
    revisionSummary:
      "Created a fallback revision because the AI provider was unavailable. Rudy should review and refine before approval.",
  };
}

async function callOpenAiForRevision(input: {
  asset: RevisionAsset;
  campaign: RevisionCampaign | null;
  instructions: string;
  cloneContext: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: buildUserPrompt(input),
        },
      ],
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`OpenAI revision request failed: ${response.status} ${response.statusText} — ${text}`);
  }

  const payload = safeJsonParse(text);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("OpenAI returned an unexpected revision response.");
  }

  const choices = (payload as Record<string, unknown>).choices;

  if (!Array.isArray(choices)) {
    throw new Error("OpenAI revision response did not include choices.");
  }

  const message = (choices[0] as Record<string, unknown> | undefined)?.message;

  const messageContent =
    message && typeof message === "object" && !Array.isArray(message)
      ? (message as Record<string, unknown>).content
      : null;

  if (typeof messageContent !== "string") {
    throw new Error("OpenAI revision response did not include message content.");
  }

  return coerceRevision(extractJsonFromText(messageContent), input.asset.title ?? "Revised asset");
}

export async function generateAssetRevision(
  input: GenerateAssetRevisionInput
): Promise<GeneratedAssetRevision> {
  const cloneContext = await loadDigitalCloneContext(input.userId);

  const cloneMemorySnapshot = {
    profileLoaded: Boolean(cloneContext.profile),
    brandRuleCount: cloneContext.brandRules.length,
    contentExampleCount: cloneContext.contentExamples.length,
    knowledgeSourceCount: cloneContext.knowledgeSources.length,
    serviceLineCount: cloneContext.serviceLines.length,
    buyerSegmentCount: cloneContext.buyerSegments.length,
    offerCount: cloneContext.offers.length,
    formattedContextPreview: cloneContext.formattedContext.slice(0, 2000),
    generatedAt: new Date().toISOString(),
  };

  const aiRevision = await callOpenAiForRevision({
    asset: input.asset,
    campaign: input.campaign,
    instructions: input.instructions,
    cloneContext: cloneContext.formattedContext,
  });

  const revision =
    aiRevision ??
    createFallbackRevision({
      asset: input.asset,
      instructions: input.instructions,
    });

  return {
    ...revision,
    cloneMemorySnapshot,
  };
}
