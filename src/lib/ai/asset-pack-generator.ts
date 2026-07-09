import {
  buildMarketingAssetPackSystemPrompt,
  buildMarketingAssetPackUserPrompt,
  buildPreReviewEnrichmentSystemPrompt,
  buildPreReviewEnrichmentUserPrompt,
} from "./prompts";
import { buildGalaxyAiPromptFromVideoScript } from "@/lib/galaxyai/prompt-builder";
import { resolveAudiencePerspective } from "@/lib/content-generation/audience-perspective";
import { resolveCampaignDetailContext } from "@/lib/content-generation/campaign-detail";
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

  const pack: MarketingAssetPack = {
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

  return hasUsableAssetPackContent(pack) ? pack : null;
}

const PUBLIC_ASSET_KEYS: Array<keyof MarketingAssetPack> = [
  "emailDraft",
  "linkedinPost",
  "facebookPost",
  "youtubeDescription",
  "shortVideoScript",
];

const RAW_CONTEXT_LEAK_PATTERNS = [
  /\bcore messages?\s*:/i,
  /\bproof points?\s*:/i,
  /\bobjections? to address\s*:/i,
  /\bstrategy context\s*:/i,
  /\bsource context\s*:/i,
  /\bbuyer segment\s*:/i,
  /\bcampaign idea\s*:/i,
  /\buser notes?\s*:/i,
  /\bdifferentiator\s*:/i,
  /\boriginality angle\s*:/i,
  /\bthis (?:campaign|asset pack|content|post|email)\b/i,
  /\bthe (?:reader|buyer) needs?\b/i,
  /\ba useful (?:article|post|email|asset) should\b/i,
];

function wordCount(value: string) {
  return value.split(/\s+/).map((word) => word.trim()).filter(Boolean).length;
}

function assetPackHasUsablePublicCopy(assetPack: MarketingAssetPack) {
  return (
    wordCount(assetPack.emailDraft) >= 90 &&
    wordCount(assetPack.linkedinPost) >= 55 &&
    wordCount(assetPack.facebookPost) >= 45 &&
    wordCount(assetPack.shortVideoScript) >= 70
  );
}

function assetPackHasEnoughTotalFields(assetPack: MarketingAssetPack | null | undefined) {
  if (!assetPack) return false;

  const usableTotalFields = Object.values(assetPack).filter(
    (value) => typeof value === "string" && value.trim().length >= 20,
  ).length;

  return usableTotalFields >= 5;
}

function assetPackHasRawContextLeak(assetPack: MarketingAssetPack) {
  return PUBLIC_ASSET_KEYS.some((key) =>
    RAW_CONTEXT_LEAK_PATTERNS.some((pattern) => pattern.test(assetPack[key] ?? "")),
  );
}

function hasUsableAssetPackContent(assetPack: MarketingAssetPack | null | undefined) {
  if (!assetPack) return false;

  return assetPackHasEnoughTotalFields(assetPack);
}

function assetPackIsReviewReady(assetPack: MarketingAssetPack | null | undefined) {
  if (!assetPack) return false;

  return assetPackHasUsablePublicCopy(assetPack) && !assetPackHasRawContextLeak(assetPack);
}

function isOpenAiFallbackEnabled() {
  return process.env.VIP_DISABLE_ASSET_PACK_FALLBACK !== "1";
}

function timeoutFromEnv(name: string, fallbackMs: number) {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}


function createFallbackAssetPack(input: GenerateMarketingAssetPackInput): MarketingAssetPack {
  const campaign = input.campaign;
  const audience = campaign.audience ?? campaign.buyer_segment ?? "business owners";
  const perspective = resolveAudiencePerspective(audience);
  const detailContext = resolveCampaignDetailContext({
    audience,
    topic: campaign.idea,
    offer: campaign.cta,
    objective: campaign.goal,
    businessContext: campaign.notes,
    differentiator: campaign.strategy?.differentiator,
    proofPoints: campaign.strategy?.proofPoints,
    objections: campaign.strategy?.objections,
  });
  const buyer = perspective.readerLabel;
  const directAddress = perspective.directAddress;
  const goal = campaign.goal ?? "book qualified conversations";
  const cta = campaign.cta ?? "Book a call";
  const offer = detailContext.plainLanguageOffer;
  const topAreas = detailContext.reviewAreas.slice(0, 4);
  const areaBullets = topAreas.map((area) => `- ${area}`).join("\n");
  const question = detailContext.buyerQuestions[0] ?? "What should we fix first?";
  const concern = perspective.everydayConcerns[0] ?? "not knowing what to fix first";

  return {
    campaignStrategy: `Campaign strategy for ${campaign.name}: Write to ${buyer}, not to marketers. Use the user campaign brief as the controlling strategy and translate it into natural public copy. The campaign should help ${buyer} understand ${offer}, especially how it relates to ${directAddress}, ${goal}, and the practical question: ${question}.`,
    audienceAngle: `${buyer} are likely dealing with ${concern}. The strongest angle is to make the problem concrete, explain what the review or offer actually looks at, and help the owner see which fixes should be prioritized before they spend more time guessing.`,
    coreMessage: `${offer} should feel like a practical first step, not a hard sell. It should help ${buyer} understand the visibility, trust, content, and conversion gaps that may be costing them better opportunities, then point them toward a clear next step: ${cta}.`,
    emailDraft: `Subject: A clearer way to see what is holding ${directAddress} back\nPreview: A practical look at what to check before guessing at another marketing fix.\n\nHi,\n\nIf ${directAddress} is not showing up where people are searching, the answer is not always to post more content or spend more money. Sometimes the first step is simply knowing what is missing.\n\nA useful review should look at the pieces that affect whether someone can find you, trust you, and take the next step. That usually includes your search visibility, local profile information, website service pages, reviews, common question gaps, and the path someone follows when they are ready to call or book.\n\nThat is what ${offer} is meant to clarify. The goal is to help you see what matters first, what can wait, and where better recommendations could make the biggest difference.\n\nIf this would be useful, the next step is ${cta}.\n\nBest,\nRudy`,
    linkedinPost: `A lot of ${buyer} do not need another vague marketing suggestion. They need to know what is actually holding ${directAddress} back.\n\nThat is where ${offer} becomes useful.\n\nA good review should look at the real places people make decisions before they ever call:\n\n${areaBullets}\n\nThe point is not to overwhelm you with technical marketing language. It is to help you see what is missing, what matters first, and what would make ${directAddress} easier to find, trust, and contact.\n\nIf you want a clearer starting point, ${cta}.\n\n#AIOptimization #LocalSEO #MarketingAudit #WebSearchPros`,
    facebookPost: `🔎 If ${directAddress} is not getting the visibility or calls you expected, guessing at the next marketing fix can waste a lot of time.\n\n${offer} gives you a clearer way to look at the basics: how people find you, what they see when they compare options, whether your services are easy to understand, and whether the next step is obvious.\n\nFor ${buyer}, that kind of clarity matters. It can show whether the issue is search visibility, your Google profile, website content, reviews, unanswered patient or customer questions, or a booking path that creates friction.\n\nThe goal is simple: know what to fix first.\n\n${cta}\n\n#LocalBusiness #MarketingAudit #AIOptimization #WebSearchPros`,
    youtubeTitle: `${campaign.name}: What ${buyer} Should Check First`,
    youtubeDescription: `This video explains how ${buyer} can think through ${offer} in plain language. The focus is on the practical gaps that can keep a business from being found, trusted, and contacted when people are ready to make a decision.\n\nKey areas include visibility, local profiles, website clarity, reviews, content gaps, and the next-step path from interest to conversation.\n\nNext step: ${cta}`,
    shortVideoScript: `Hook: If ${directAddress} is not showing up where people are searching, do not guess at the fix.\n\nScene 1: Show an owner looking at search results, a website, reviews, and a local profile.\nVoiceover: The problem may be visibility, trust, content clarity, or the path someone takes before they contact you.\n\nScene 2: Show those pieces becoming organized into a simple review: visibility, local profile, website pages, reviews, FAQs, and CTA.\nVoiceover: ${offer} helps identify what is missing and what should be fixed first.\n\nScene 3: Show a clear recommendation list and a simple next step.\nVoiceover: The goal is not more marketing noise. It is a clearer path from being found to being chosen.\n\nClose: ${cta}.`,
    galaxyAiCreativePrompt: `Create a polished, modern 20-second business marketing video concept for ${campaign.name}. Show a ${buyer} decision-maker reviewing search results, a local profile, website service pages, reviews, and appointment/contact options. Visualize those pieces becoming a simple audit framework: visibility, trust, content clarity, and conversion path. Tone should be practical, premium, and calm. Camera: smooth push-ins, clean screen transitions, subtle motion graphics. Avoid fake rankings, fake traffic charts, exaggerated claims, and cluttered on-screen text.`,
    approvalChecklist: `Before using this campaign, confirm:\n- The assets speak to ${buyer}, not to marketers.\n- The user's detailed campaign direction is reflected without being copied verbatim.\n- The offer is explained in concrete, plain language.\n- The copy names practical areas the review can examine.\n- The CTA is clear and not overly pushy.\n- No unsupported claims, fake proof, fake rankings, or guaranteed outcomes are included.\n- The public assets do not include raw labels such as proof points, strategy context, buyer segment, or core messages.`,
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

  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
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
  }, timeoutFromEnv("VIP_ASSET_PACK_OPENAI_TIMEOUT_MS", 18000));

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

  if (
    !apiKey ||
    process.env.VIP_ENABLE_PRE_REVIEW_ENRICHMENT !== "1" ||
    process.env.VIP_DISABLE_PRE_REVIEW_ENRICHMENT === "1"
  ) {
    return assetPack;
  }

  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
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
    }, timeoutFromEnv("VIP_ASSET_PACK_ENRICHMENT_TIMEOUT_MS", 8000));

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
  let openAiResult: MarketingAssetPack | null = null;

  try {
    openAiResult = await callOpenAiForAssetPack(input);
  } catch (error) {
    if (!isOpenAiFallbackEnabled()) {
      throw error;
    }

    console.error("Asset pack OpenAI generation failed; using safe fallback asset pack.", error);
  }

  if (assetPackIsReviewReady(openAiResult)) {
    const enriched = await enrichAssetPackBeforeReview(input, openAiResult);

    return normalizeGalaxyAiPromptFromVideoScript(
      assetPackIsReviewReady(enriched) ? enriched : openAiResult,
      input,
    );
  }

  const fallback = createFallbackAssetPack(input);
  const enrichedFallback = await enrichAssetPackBeforeReview(input, fallback);

  return normalizeGalaxyAiPromptFromVideoScript(
    assetPackIsReviewReady(enrichedFallback) ? enrichedFallback : fallback,
    input,
  );
}
