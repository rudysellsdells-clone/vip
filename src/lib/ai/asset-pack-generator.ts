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
  /\bwrite to\b.*\bnot to marketers\b/i,
  /\buse the user campaign brief\b/i,
  /\bcontrolling strategy\b/i,
  /\btranslate it into natural public copy\b/i,
  /\bbrand\/?training context\b/i,
  /\bpublic-facing (?:content|copy|assets?)\b/i,
  /\bfinal reader\b/i,
  /\bthe campaign should help\b/i,
  /\bmust be written from\b/i,
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
  return Object.values(assetPack).some((value) =>
    RAW_CONTEXT_LEAK_PATTERNS.some((pattern) => pattern.test(value ?? "")),
  );
}

function hasUsableAssetPackContent(assetPack: MarketingAssetPack | null | undefined) {
  if (!assetPack) return false;

  return assetPackHasEnoughTotalFields(assetPack);
}

function assetPackIsReviewReady(
  assetPack: MarketingAssetPack | null | undefined,
): assetPack is MarketingAssetPack {
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


function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function strategyValue(strategy: Record<string, unknown> | null | undefined, key: string) {
  const value = strategy?.[key];
  return typeof value === "string" ? cleanText(value) : "";
}

function combinedCampaignBrief(input: GenerateMarketingAssetPackInput) {
  const campaign = input.campaign;
  const strategy = campaign.strategy ?? null;

  return [
    campaign.name,
    campaign.idea,
    campaign.buyer_segment,
    campaign.audience,
    campaign.goal,
    campaign.cta,
    campaign.notes,
    strategyValue(strategy, "differentiator"),
    strategyValue(strategy, "proofPoints"),
    strategyValue(strategy, "originalityAngle"),
    strategyValue(strategy, "objections"),
    strategyValue(strategy, "strategyContext"),
    strategyValue(strategy, "sourceContext"),
  ]
    .map(cleanText)
    .filter(Boolean)
    .join("\n\n");
}

function hasFirstMarketingHireIntent(input: GenerateMarketingAssetPackInput) {
  return /first\s+(?:marketing\s+)?hire|first\s+marketer|hire\s+(?:a\s+)?marketer|hiring\s+(?:your\s+)?first\s+marketer|marketing\s+hire/i.test(
    combinedCampaignBrief(input),
  );
}

function createFirstMarketingHireAssetPack(
  input: GenerateMarketingAssetPackInput,
  context: {
    buyer: string;
    directAddress: string;
    cta: string;
    tone: string;
  },
): MarketingAssetPack {
  const campaign = input.campaign;
  const { buyer, directAddress, cta } = context;
  const offer = cta || "grab 30 minutes";

  return {
    campaignStrategy: `Position ${campaign.name} as a practical decision checkpoint for ${buyer} who feel the pressure to improve marketing but are not sure whether the answer is a first marketing hire, an outside partner, or a clearer system. The strategic point of view is that hiring too early can be expensive when the real problem has not been diagnosed. Many owner-led businesses expect one marketer to handle strategy, website updates, SEO, content, social media, ads, reporting, lead follow-up, and vendor management all at once. The message gives the owner a way to slow down, identify the actual gaps, and use ${offer} as a low-pressure step before adding payroll or signing another vendor.`,
    audienceAngle: `${buyer} are usually not sitting around thinking about marketing theory. They are thinking about full schedules, better-fit jobs, inconsistent leads, competitors who look more professional online, and whether the next marketing expense will actually pay off. The strongest angle is to speak to the moment when the owner knows marketing needs attention but does not yet know if they need a hire, a plan, a specialist, or a better operating system.`,
    coreMessage: `Before ${buyer} hire their first marketer, they need to understand what problem they are trying to solve. A good first step is not another generic marketing checklist. It is a clear look at what is missing, what is working, what can be fixed quickly, and what kind of marketing help would actually move ${directAddress} forward.`,
    emailDraft: `Subject: Before you hire your first marketer\nPreview: A practical way to figure out what kind of marketing help your business actually needs.\n\nHi,\n\nA lot of contractors reach a point where marketing starts to feel too important to keep handling casually. Referrals still matter, but the website needs work, search visibility feels uneven, social posts are inconsistent, follow-up is scattered, and competitors may look easier to understand online.\n\nThat is usually when the question comes up: should we hire our first marketer?\n\nThe honest answer is that it depends on the problem you are trying to solve. Some businesses need a full-time marketing coordinator. Some need better strategy before they hire. Some need a specialist for SEO, content, paid media, automation, or website improvements. Some need a fractional partner who can build the system before a full-time hire makes sense.\n\nThe risk is hiring one person and expecting them to replace an entire marketing department. That can lead to frustration for the owner, the hire, and the business.\n\nIf this decision is on your mind, ${offer} is a practical place to start. We can look at where the gaps are, what kind of help would matter most, and whether a first marketing hire is really the right next move.\n\nBest,\nRudy`,
    linkedinPost: `A lot of contractors eventually hit the same marketing question:\n\n“Do we need to hire someone for this?”\n\nMaybe the website feels outdated. Maybe leads are inconsistent. Maybe competitors show up better in search. Maybe the owner is tired of trying to manage posts, ads, emails, vendors, and follow-up between job sites and estimates.\n\nBut hiring your first marketer is a big move. The mistake is assuming one person can walk in and solve strategy, SEO, website updates, content, social media, paid ads, reporting, CRM follow-up, and lead generation all at once.\n\nBefore you hire, it helps to know what problem you actually need solved.\n\nIs the gap strategy? Execution? Visibility? Content? Systems? Sales follow-up? Vendor management?\n\nThat clarity can save a lot of time and money.\n\nIf you are wondering what kind of marketing help your contracting business really needs, ${offer}.\n\n#ContractorMarketing #SmallBusinessMarketing #MarketingStrategy #LeadGeneration #WebSearchPros`,
    facebookPost: `Thinking about hiring your first marketing person?\n\nFor a contracting business, that can be a smart move — but only if you know what you actually need that person to fix.\n\nOne marketer cannot usually handle strategy, SEO, website updates, social media, paid ads, content, reporting, lead follow-up, and vendor management all at once. That is how owners end up disappointed and new hires end up overwhelmed.\n\nBefore you add payroll, it helps to look at the real gaps:\n\n- Are you hard to find online?\n- Is the website unclear?\n- Are leads coming from the wrong places?\n- Is follow-up inconsistent?\n- Do you need strategy, execution, or both?\n\nIf you want a clearer starting point, ${offer}.`,
    youtubeTitle: `Before You Hire Your First Marketer: What Contractors Should Know`,
    youtubeDescription: `Hiring your first marketer can be a smart step for a contracting business, but it is easy to make the move before the real problem is clear.\n\nThis video explains how contractors and trade business owners can think through the decision before adding payroll. The goal is to understand whether the business needs strategy, execution, better visibility, stronger website content, improved follow-up, vendor management, or a more complete marketing system.\n\nBefore you ask one person to solve everything, take a practical look at what is missing and what kind of help would actually move the business forward.\n\nNext step: ${offer}.`,
    shortVideoScript: `Hook: Before you hire your first marketer, make sure you know what problem you need that person to solve.\n\nScene 1: Show a contractor reviewing a website, missed follow-ups, search results, social posts, and vendor emails.\nVoiceover: A lot of contracting businesses reach the point where marketing feels too important to keep handling casually.\n\nScene 2: Show a checklist splitting into strategy, SEO, website, content, paid ads, reporting, and follow-up.\nVoiceover: The risk is expecting one person to replace an entire marketing department before the gaps are clear.\n\nScene 3: Show the clutter becoming a simple decision map: what is missing, what matters first, and what kind of help fits.\nVoiceover: Before you hire, figure out whether you need a marketer, a specialist, a partner, or a better system.\n\nClose: If you want a clearer starting point, ${offer}.`,
    galaxyAiCreativePrompt: `Create a polished 20-second video concept for ${campaign.name}. Show a contractor or trade business owner reviewing a messy mix of website updates, search results, leads, social posts, emails, and vendor notes. Then show the clutter organizing into a clear decision framework: strategy, visibility, website, content, follow-up, reporting, and hiring options. Tone: practical, premium, calm, and business-owner focused. Camera: clean cinematic push-ins, desktop/tablet interface shots, subtle motion graphics. Avoid fake revenue charts, exaggerated promises, generic stock-photo smiles, and cluttered text.`,
    approvalChecklist: `Before using this campaign, confirm:\n- The assets speak to contractors and trade business owners, not marketers.\n- The first-marketing-hire decision is explained in practical business language.\n- The content makes clear that one hire should not be expected to replace an entire marketing department.\n- The CTA feels like a useful decision conversation, not a hard sell.\n- No unsupported claims, fake results, or guaranteed outcomes are included.\n- The user’s campaign idea is reflected without copying raw planning fields into the public copy.`,
  };
}

function firstSentence(value: string, fallback: string) {
  const cleaned = cleanText(value);
  if (!cleaned) return fallback;
  const [sentence] = cleaned.split(/(?<=[.!?])\s+/);
  return cleanText(sentence || cleaned);
}

function createApprovedStrategyFallbackAssetPack(
  input: GenerateMarketingAssetPackInput,
): MarketingAssetPack | null {
  const strategy = input.approvedCampaignStrategy;
  if (!strategy) return null;

  const campaign = input.campaign;
  const audience = cleanText(strategy.targetAudience) || "the intended audience";
  const situation = cleanText(strategy.buyerSituation);
  const problem = cleanText(strategy.coreProblem);
  const consequence = cleanText(strategy.businessConsequence);
  const pointOfView = cleanText(strategy.campaignPointOfView);
  const offer = cleanText(strategy.offerExplanation);
  const deliverables = cleanText(strategy.offerDeliverables);
  const proof = cleanText(strategy.proofAndSupport);
  const objection = cleanText(strategy.objectionsAndResponse);
  const cta = cleanText(strategy.primaryCta) || "Take the next step";
  const subjectProblem = firstSentence(problem, campaign.name).replace(/[.!?]+$/, "");

  return {
    campaignStrategy: [
      strategy.campaignObjective,
      pointOfView,
      offer,
      strategy.messageProgression,
    ]
      .filter(Boolean)
      .join("\n\n"),
    audienceAngle: [audience, situation, problem].filter(Boolean).join("\n\n"),
    coreMessage: [pointOfView, offer, cta].filter(Boolean).join("\n\n"),
    emailDraft: `Subject: ${subjectProblem}
Preview: ${firstSentence(consequence, `A practical look at why this matters to ${audience}.`)}

Hi,

${situation}

${problem}

${consequence}

${pointOfView}

${offer}

${deliverables}

${proof}

${objection}

${cta}.

Best,
Rudy`,
    linkedinPost: `${situation}

${problem}

${consequence}

Here is the point too many businesses miss:

${pointOfView}

${offer}

${deliverables}

${proof}

${objection}

${cta}.`,
    facebookPost: `${situation}

${problem}

That matters because ${consequence.charAt(0).toLowerCase()}${consequence.slice(1)}

${pointOfView}

${offer}

${deliverables}

${objection}

${cta}.`,
    youtubeTitle: `${campaign.name}: ${subjectProblem}`,
    youtubeDescription: `${situation}

This video explains ${problem.charAt(0).toLowerCase()}${problem.slice(1)} and why it can lead to ${consequence.charAt(0).toLowerCase()}${consequence.slice(1)}

The central idea is simple: ${pointOfView}

${offer}

What the buyer receives:
${deliverables}

Next step: ${cta}.`,
    shortVideoScript: `Hook: ${firstSentence(problem, subjectProblem)}

Scene 1: Show a realistic moment that reflects this buyer situation: ${situation}
Voiceover: ${consequence}

Scene 2: Show the existing approach creating friction or missed opportunity.
Voiceover: ${pointOfView}

Scene 3: Show the offer in action without fake interfaces or unsupported results.
Voiceover: ${offer} ${deliverables}

Close: ${cta}.`,
    galaxyAiCreativePrompt: `Create a polished 20-second campaign video for ${campaign.name}. Audience: ${audience}. Open with a realistic visual representation of this buyer situation: ${situation}. Show the problem and consequence: ${problem} ${consequence}. Transition to the approved point of view and offer mechanism: ${pointOfView} ${offer}. Show the deliverables through believable business actions rather than fake dashboards or text-heavy graphics: ${deliverables}. End with a clear visual next step connected to: ${cta}. Use cinematic natural lighting, purposeful camera movement, realistic people and environments, and minimal readable text. Avoid generic marketing imagery, fake statistics, fabricated testimonials, distorted logos, and unsupported outcomes.`,
    approvalChecklist: `Confirm that every asset:
- Follows the approved campaign point of view.
- Speaks to ${audience} in a recognizable situation.
- Explains the problem, consequence, offer, and deliverables clearly.
- Uses only approved proof.
- Addresses the selected objection honestly.
- Ends with the approved CTA: ${cta}.
- Does not reintroduce raw settings, field labels, or generic brand language.`,
  };
}

function createFallbackAssetPack(input: GenerateMarketingAssetPackInput): MarketingAssetPack {
  const approvedFallback = createApprovedStrategyFallbackAssetPack(input);
  if (approvedFallback) return approvedFallback;

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
  const topAreas = detailContext.reviewAreas.slice(0, 5);
  const areaBullets = topAreas.map((area) => `- ${area}`).join("\n");
  const question = detailContext.buyerQuestions[0] ?? "What should we fix first?";
  const concern = perspective.everydayConcerns[0] ?? "not knowing what to fix first";

  if (hasFirstMarketingHireIntent(input)) {
    return createFirstMarketingHireAssetPack(input, {
      buyer,
      directAddress,
      cta,
      tone: campaign.tone ?? "clear, practical, confident",
    });
  }

  return {
    campaignStrategy: `Position ${campaign.name} around a practical business question ${buyer} already understand: ${question} The angle is not generic awareness. It is a clear explanation of what ${offer} helps uncover, why that matters to ${directAddress}, and how ${cta} gives the owner a reasonable next step without guessing. The strongest path is problem, specific review areas, practical consequence, then a clear invitation to act.`,
    audienceAngle: `${buyer} are likely dealing with ${concern}. Lead with the operating problem they can recognize, then explain the specific areas that affect visibility, trust, clarity, and the path from interest to conversation. The language should feel useful to an owner who wants to know what matters first, not like marketing theory.`,
    coreMessage: `${offer} gives ${buyer} a clearer way to understand what is helping, what is missing, and what should be fixed first. The value is not more marketing noise. It is a practical view of the gaps that may be making ${directAddress} harder to find, understand, trust, or contact.`,
    emailDraft: `Subject: A clearer way to see what is holding ${directAddress} back\nPreview: A practical look at what to check before guessing at another marketing fix.\n\nHi,\n\nIf ${directAddress} is not showing up where people are searching, the answer is not always to post more content or spend more money. Sometimes the first step is simply knowing what is missing.\n\nA useful review should look at the pieces that affect whether someone can find you, trust you, and take the next step. That usually includes visibility, public profiles, website clarity, reviews, common question gaps, and the path someone follows when they are ready to call or book.\n\nThat is what ${offer} is meant to clarify. The goal is to help you see what matters first, what can wait, and where better recommendations could make the biggest difference.\n\nIf this would be useful, the next step is ${cta}.\n\nBest,\nRudy`,
    linkedinPost: `A lot of ${buyer} do not need another vague marketing suggestion. They need to know what is actually holding ${directAddress} back.\n\nThat is where ${offer} becomes useful.\n\nA practical review looks at the places people make decisions before they ever call:\n\n${areaBullets}\n\nThe point is not to overwhelm you with technical marketing language. It is to help you see what is missing, what matters first, and what would make ${directAddress} easier to find, trust, and contact.\n\nIf you want a clearer starting point, ${cta}.\n\n#AIOptimization #LocalSEO #MarketingAudit #WebSearchPros`,
    facebookPost: `🔎 If ${directAddress} is not getting the visibility or calls you expected, guessing at the next marketing fix can waste a lot of time.\n\n${offer} gives you a clearer way to look at the basics: how people find you, what they see when they compare options, whether your services are easy to understand, and whether the next step is obvious.\n\nFor ${buyer}, that kind of clarity matters. It can show whether the issue is visibility, public profiles, website content, reviews, unanswered questions, or a contact path that creates friction.\n\nThe goal is simple: know what to fix first.\n\n${cta}\n\n#LocalBusiness #MarketingAudit #AIOptimization #WebSearchPros`,
    youtubeTitle: `${campaign.name}: What ${buyer} Should Check First`,
    youtubeDescription: `This video explains how ${buyer} can think through ${offer} in plain language. The focus is on the practical gaps that can keep a business from being found, trusted, and contacted when people are ready to make a decision.\n\nKey areas include visibility, public profiles, website clarity, reviews, content gaps, and the next-step path from interest to conversation.\n\nNext step: ${cta}`,
    shortVideoScript: `Hook: If ${directAddress} is not showing up where people are searching, do not guess at the fix.\n\nScene 1: Show an owner looking at search results, a website, reviews, and a local profile.\nVoiceover: The problem may be visibility, trust, content clarity, or the path someone takes before they contact you.\n\nScene 2: Show those pieces becoming organized into a simple review: visibility, public profiles, website pages, reviews, questions, and CTA.\nVoiceover: ${offer} helps identify what is missing and what should be fixed first.\n\nScene 3: Show a clear recommendation list and a simple next step.\nVoiceover: The goal is not more marketing noise. It is a clearer path from being found to being chosen.\n\nClose: ${cta}.`,
    galaxyAiCreativePrompt: `Create a polished, modern 20-second business marketing video concept for ${campaign.name}. Show a ${buyer} decision-maker reviewing search results, a local profile, website service pages, reviews, and appointment/contact options. Visualize those pieces becoming a simple audit framework: visibility, trust, content clarity, and conversion path. Tone should be practical, premium, and calm. Camera: smooth push-ins, clean screen transitions, subtle motion graphics. Avoid fake rankings, fake traffic charts, exaggerated claims, and cluttered on-screen text.`,
    approvalChecklist: `Before using this campaign, confirm:\n- The assets speak to ${buyer}, not marketers.\n- The user’s detailed campaign direction is reflected without being copied verbatim.\n- The offer is explained in concrete, plain language.\n- The copy names practical areas the review can examine.\n- The CTA is clear and not overly pushy.\n- No unsupported claims, fake proof, fake rankings, or guaranteed outcomes are included.\n- The public assets do not include raw labels such as proof points, strategy context, buyer segment, or core messages.`,
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
      brandName: "Marketing VIP",
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
      model: process.env.OPENAI_ASSET_PACK_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
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
        model: process.env.OPENAI_ASSET_PACK_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
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
