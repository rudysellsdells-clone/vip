import {
  buildMarketingAssetPackSystemPrompt,
  buildMarketingAssetPackUserPrompt,
} from "./prompts";
import type { MarketingAssetPack } from "./asset-pack-types";

type GenerateMarketingAssetPackInput = Parameters<
  typeof buildMarketingAssetPackUserPrompt
>[0];

function getString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length ? value.trim() : fallback;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
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

function coerceAssetPack(value: unknown): MarketingAssetPack | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    campaignStrategy: getString(record.campaignStrategy, ""),
    audienceAngle: getString(record.audienceAngle, ""),
    coreMessage: getString(record.coreMessage, ""),
    emailDraft: getString(record.emailDraft, ""),
    linkedinPost: getString(record.linkedinPost, ""),
    facebookPost: getString(record.facebookPost, ""),
    youtubeTitle: getString(record.youtubeTitle, ""),
    youtubeDescription: getString(record.youtubeDescription, ""),
    shortVideoScript: getString(record.shortVideoScript, ""),
    galaxyAiCreativePrompt: getString(record.galaxyAiCreativePrompt, ""),
    approvalChecklist: getString(record.approvalChecklist, ""),
  };
}

function createFallbackAssetPack(input: GenerateMarketingAssetPackInput): MarketingAssetPack {
  const campaign = input.campaign;
  const buyer = campaign.buyer_segment ?? campaign.audience ?? "the target buyer";
  const goal = campaign.goal ?? "book qualified sales conversations";
  const cta = campaign.cta ?? "Book a call";
  const tone = campaign.tone ?? "clear, practical, confident";

  return {
    campaignStrategy: `Campaign strategy for ${campaign.name}: Position Rudy's services around a practical business outcome for ${buyer}. The campaign should focus on ${campaign.idea}. The primary goal is to ${goal}. Use a ${tone} tone and drive people toward this CTA: ${cta}.`,
    audienceAngle: `${buyer} likely care about practical growth, better visibility, fewer wasted marketing dollars, and clearer next steps. Lead with the business problem before explaining the service.`,
    coreMessage: `If ${buyer} want more qualified opportunities, they need a clearer digital presence, stronger content, and a marketing system built around measurable business outcomes.`,
    emailDraft: `Subject: A practical idea for ${buyer}\n\nHi,\n\nI wanted to share a quick idea around ${campaign.idea}.\n\nMany businesses are trying to improve visibility, but the real opportunity is turning that visibility into better conversations and stronger sales opportunities.\n\nThat is where Rudy can help with a practical approach to ${campaign.name}.\n\nIf it makes sense, the next step is simple: ${cta}.\n\nBest,\nRudy`,
    linkedinPost: `${campaign.idea}\n\nFor ${buyer}, visibility only matters if it turns into trust, conversations, and revenue.\n\nThe practical opportunity is to improve the way your business shows up, explain your value more clearly, and make it easier for the right prospects to take the next step.\n\n${cta}`,
    facebookPost: `${buyer}: if your online presence is not creating enough qualified conversations, it may be time to look at the full path from visibility to action.\n\n${campaign.idea}\n\nWant a practical next step? ${cta}`,
    youtubeTitle: `${campaign.name}: A Practical Marketing Plan for ${buyer}`,
    youtubeDescription: `In this video, Rudy explains how ${buyer} can think about ${campaign.idea} and turn better visibility into more qualified sales conversations. The goal is practical: improve messaging, strengthen digital presence, and create clearer calls-to-action.\n\nNext step: ${cta}`,
    shortVideoScript: `Hook: If you serve ${buyer}, better visibility is only useful if it creates better business conversations.\n\nPoint 1: Start with the problem your buyer already feels.\nPoint 2: Make your offer clear and easy to understand.\nPoint 3: Give people one simple next step.\n\nClose: If you want help with this, ${cta}.`,
    galaxyAiCreativePrompt: `Create a clean, professional marketing visual for ${campaign.name}. The visual should feel modern, practical, and business-focused. Show a small or mid-sized business owner looking at a clear digital growth dashboard with improved visibility, leads, and conversion signals. Avoid hype. Use a polished marketing style.`,
    approvalChecklist: `Before using this campaign, confirm:\n- The buyer segment is accurate.\n- The offer is clear.\n- The CTA is specific.\n- No unsupported claims are included.\n- The tone sounds like Rudy.\n- External actions are approved before publishing or sending.`,
  };
}

async function callOpenAiForAssetPack(input: GenerateMarketingAssetPackInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const systemPrompt = buildMarketingAssetPackSystemPrompt();
  const userPrompt = buildMarketingAssetPackUserPrompt(input);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText} — ${text}`);
  }

  const payload = safeJsonParse(text);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("OpenAI returned an unexpected response.");
  }

  const choices = (payload as Record<string, unknown>).choices;

  if (!Array.isArray(choices)) {
    throw new Error("OpenAI response did not include choices.");
  }

  const message = (choices[0] as Record<string, unknown> | undefined)?.message;

  const messageContent =
    message && typeof message === "object" && !Array.isArray(message)
      ? (message as Record<string, unknown>).content
      : null;

  if (typeof messageContent !== "string") {
    throw new Error("OpenAI response did not include message content.");
  }

  return coerceAssetPack(extractJsonFromText(messageContent));
}

export async function generateMarketingAssetPackWithCloneMemory(
  input: GenerateMarketingAssetPackInput
) {
  const openAiResult = await callOpenAiForAssetPack(input);

  if (openAiResult) {
    return openAiResult;
  }

  return createFallbackAssetPack(input);
}
