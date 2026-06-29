import {
  buildMarketingAssetPackSystemPrompt,
  buildMarketingAssetPackUserPrompt,
  buildPreReviewEnrichmentSystemPrompt,
  buildPreReviewEnrichmentUserPrompt,
} from "./prompts";
import { buildGalaxyAiPromptFromVideoScript } from "@/lib/galaxyai/prompt-builder";
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
    campaignStrategy: `Campaign strategy for ${campaign.name}: Position Rudy's services around a specific business outcome for ${buyer}. The campaign should focus on ${campaign.idea}, but it should not stop at awareness. It should explain the practical gap the buyer is feeling, why that gap creates missed opportunities, how Web Search Pros would approach the problem, and how the CTA connects to the next sales conversation. The primary goal is to ${goal}. Use a ${tone} tone and drive people toward this CTA: ${cta}.`,
    audienceAngle: `${buyer} are likely dealing with practical problems like weak search visibility, unclear messaging, inconsistent follow-up, content that does not support sales conversations, or marketing activity that is hard to connect to revenue. Lead with the business problem before explaining the service, and use examples that feel like a real operating situation rather than generic marketing advice.`,
    coreMessage: `If ${buyer} want more qualified opportunities, they need more than general visibility. They need a clear digital presence, content that answers real buying questions, specific calls to action, and a repeatable system that turns interest into conversations. ${campaign.name} should show how Web Search Pros helps close that gap without promising fake rankings or guaranteed results.`,
    emailDraft: `Subject: A more specific way to approach ${campaign.idea}\nPreview: A practical marketing idea for ${buyer} that need more qualified conversations.\n\nHi,\n\nI wanted to share a practical thought around ${campaign.idea}.\n\nFor ${buyer}, the issue usually is not just whether people can find the business. The bigger issue is what happens after they find it: does the website explain the offer clearly, does the content answer real buyer questions, and is there an obvious next step that creates a qualified conversation?\n\nThat is where ${campaign.name} can help. The goal is to tighten the message, improve the content path, and make the next step easier for the right prospect to take.\n\nIf it would be useful, the next step is simple: ${cta}.\n\nBest,\nRudy`,
    linkedinPost: `A lot of ${buyer} do not have a visibility problem alone. They have a clarity problem.\n\nPeople may find the business, scan the website, read a post, or see a social update — but if the message feels generic, they leave without taking action.\n\nThat is why ${campaign.idea} needs to connect three things:\n\n1. The real pain the buyer is trying to solve\n2. The proof or explanation that makes the offer believable\n3. The next step that turns attention into a conversation\n\nFor ${campaign.name}, the opportunity is to make the marketing path more specific, more useful, and easier to act on.\n\n${cta}`,
    facebookPost: `${buyer}, here is a practical question:\n\nWhen someone finds your business online, do they immediately understand what you do, why it matters, and what to do next?\n\nThat is the gap ${campaign.idea} should solve. Better content is not just about posting more often. It is about answering the questions real buyers have before they call, schedule, request pricing, or compare options.\n\n${campaign.name} is built around that idea: clearer messaging, stronger content, and a more obvious next step.\n\nWant to look at where the gaps are? ${cta}`,
    youtubeTitle: `${campaign.name}: A Practical Marketing Plan for ${buyer}`,
    youtubeDescription: `In this video, Rudy breaks down how ${buyer} can approach ${campaign.idea} in a more practical way. The focus is not generic visibility. It is the full path from being found, to being understood, to creating a qualified sales conversation.\n\nYou will learn how clearer messaging, better content structure, stronger calls to action, and a more intentional follow-up path can help a business turn attention into action without relying on hype or fake promises.\n\nNext step: ${cta}`,
    shortVideoScript: `Hook: If you serve ${buyer}, better visibility is only useful if it turns into better conversations.\n\nScene 1: Show a business owner looking at a website, social post, or search result and wondering why people are not taking the next step.\nVoiceover: The problem is not always traffic. Sometimes the message is too generic for people to know why they should act.\n\nScene 2: Show the marketing path becoming clearer: service page, helpful content, CTA, follow-up.\nVoiceover: ${campaign.name} is about making that path easier to understand and easier to act on.\n\nScene 3: Show a clean dashboard or simple workflow with visibility, trust, content, and conversations connected.\nVoiceover: When your marketing answers real buyer questions, the next step feels natural.\n\nClose: Want to find the gaps in your current path? ${cta}.`,
    galaxyAiCreativePrompt: `Create a polished, modern 20-second business marketing video concept for ${campaign.name}. Visual style: bright, clean, premium Web Search Pros feel with white and blue tones, practical business energy, and no hype. Scene 1: a ${buyer} decision-maker reviews a confusing digital presence with scattered website, search, and social signals. Scene 2: the screen transforms into a clear marketing workflow showing visibility, messaging, content, CTA, and qualified conversations. Scene 3: a simple dashboard shows the path becoming easier to understand and act on. Camera: smooth cinematic push-ins, clean transitions, subtle motion graphics. Avoid generic stock-photo smiles, fake revenue charts, exaggerated claims, and on-screen text unless it is minimal and purposeful.`,
    approvalChecklist: `Before using this campaign, confirm:\n- The buyer segment is accurate and specific.\n- The pain point sounds like a real business situation.\n- The offer is clear and tied to the problem.\n- The CTA is specific and appropriate for the channel.\n- The asset includes enough detail to avoid sounding generic.\n- No unsupported claims, fake proof, or guaranteed outcomes are included.\n- The tone sounds like Rudy and Web Search Pros.\n- External actions are approved before publishing or sending.`,
  };
}

function normalizeGalaxyAiPromptFromVideoScript(
  assetPack: MarketingAssetPack,
  input: GenerateMarketingAssetPackInput
): MarketingAssetPack {
  const script = assetPack.shortVideoScript?.trim();

  if (!script) {
    return assetPack;
  }

  return {
    ...assetPack,
    galaxyAiCreativePrompt: buildGalaxyAiPromptFromVideoScript({
      title: input.campaign.name,
      videoScript: script,
      campaignAngle: input.campaign.idea,
      callToAction: input.campaign.cta,
      brandName: "Web Search Professionals",
      audience: input.campaign.buyer_segment ?? input.campaign.audience,
    }),
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

async function enrichAssetPackBeforeReview(
  input: GenerateMarketingAssetPackInput,
  assetPack: MarketingAssetPack
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || process.env.VIP_DISABLE_PRE_REVIEW_ENRICHMENT === "1") {
    return assetPack;
  }

  try {
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
            content: buildPreReviewEnrichmentSystemPrompt(),
          },
          {
            role: "user",
            content: buildPreReviewEnrichmentUserPrompt(input, assetPack),
          },
        ],
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      return assetPack;
    }

    const payload = safeJsonParse(text);

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return assetPack;
    }

    const choices = (payload as Record<string, unknown>).choices;

    if (!Array.isArray(choices)) {
      return assetPack;
    }

    const message = (choices[0] as Record<string, unknown> | undefined)?.message;
    const messageContent =
      message && typeof message === "object" && !Array.isArray(message)
        ? (message as Record<string, unknown>).content
        : null;

    if (typeof messageContent !== "string") {
      return assetPack;
    }

    return coerceAssetPack(extractJsonFromText(messageContent)) ?? assetPack;
  } catch {
    return assetPack;
  }
}

export async function generateMarketingAssetPackWithCloneMemory(
  input: GenerateMarketingAssetPackInput
) {
  const openAiResult = await callOpenAiForAssetPack(input);

  if (openAiResult) {
    const enriched = await enrichAssetPackBeforeReview(input, openAiResult);
    return normalizeGalaxyAiPromptFromVideoScript(enriched, input);
  }

  const fallback = createFallbackAssetPack(input);
  const enrichedFallback = await enrichAssetPackBeforeReview(input, fallback);

  return normalizeGalaxyAiPromptFromVideoScript(enrichedFallback, input);
}
