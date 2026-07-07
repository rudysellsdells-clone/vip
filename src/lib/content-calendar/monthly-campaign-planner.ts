import {
  WEEKLY_CAMPAIGN_ASSET_BLUEPRINT,
  WeeklyAssetBlueprint,
  assetTypeLabel,
} from "@/lib/content-calendar/monthly-campaign-blueprint";
import {
  buildMarketingSpineAssetBrief,
  formatMarketingSpineForPrompt,
  marketingSpineSummary,
  type MarketingSpine,
} from "@/lib/content-calendar/marketing-spine";
import { buildGalaxyAiPromptFromVideoScript } from "@/lib/galaxyai/prompt-builder";
import {
  buildCampaignVisualDirection,
  buildGalaxyAiSocialImagePrompt,
} from "@/lib/galaxyai/image-prompt-builder";
import { buildGenerationPromptDoctrineSection } from "@/lib/ai/prompt-doctrine";

export type MonthlyCampaignStrategyInput = {
  monthlyObjective?: string;
  targetAudience?: string;
  primaryOffer?: string;
  keyTopics?: string;
  tone?: string;
  callToAction?: string;
  differentiator?: string;
  proofPoints?: string;
  originalityAngle?: string;
  objections?: string;
};

export type MonthlyCampaignPlanInput = {
  month: string;
  businessContext?: string;
  campaignTheme?: string;
  strategy?: MonthlyCampaignStrategyInput;
  marketingSpine?: MarketingSpine | null;
};

export type WeeklyCampaignPlan = {
  weekNumber: number;
  campaignName: string;
  publicTopic: string;
  publicTitle: string;
  campaignAngle: string;
  generationPrompt: string;
  weekStartDate: string;
  weekEndDate: string;
  strategy: MonthlyCampaignStrategyInput;
  marketingSpine?: MarketingSpine | null;
  assets: Array<{
    assetType: WeeklyAssetBlueprint["assetType"];
    title: string;
    content: string;
    plannedPublishDate: string;
    scheduledPublishAt: string;
    sortOrder: number;
    calendarNotes: string;
    generationPrompt: string;
    metadata?: Record<string, unknown>;
  }>;
};

function parseMonth(month: string) {
  const match = /^\d{4}-\d{2}$/.exec(month);

  if (!match) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
      monthValue: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    };
  }

  const [yearString, monthString] = month.split("-");

  return {
    year: Number(yearString),
    monthIndex: Number(monthString) - 1,
    monthValue: month,
  };
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthLabel(month: string) {
  const parsed = parseMonth(month);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(parsed.year, parsed.monthIndex, 1));
}

function firstMondayOnOrAfterFirst(month: string) {
  const parsed = parseMonth(month);
  const date = new Date(parsed.year, parsed.monthIndex, 1, 12, 0, 0);
  const day = date.getDay();
  const offset = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  date.setDate(date.getDate() + offset);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function setLocalTime(date: Date, hour: number, minute: number) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function campaignWeeksForMonth(month: string) {
  const parsed = parseMonth(month);
  const weeks: Array<{
    weekNumber: number;
    start: Date;
    end: Date;
  }> = [];

  let start = firstMondayOnOrAfterFirst(month);
  let weekNumber = 1;

  while (start.getMonth() === parsed.monthIndex && weekNumber <= 5) {
    const end = addDays(start, 4);

    weeks.push({
      weekNumber,
      start: new Date(start),
      end,
    });

    start = addDays(start, 7);
    weekNumber += 1;
  }

  return weeks;
}

function cleanStrategy(
  strategy?: MonthlyCampaignStrategyInput,
): MonthlyCampaignStrategyInput {
  return {
    monthlyObjective: strategy?.monthlyObjective?.trim() || "",
    targetAudience: strategy?.targetAudience?.trim() || "",
    primaryOffer: strategy?.primaryOffer?.trim() || "",
    keyTopics: strategy?.keyTopics?.trim() || "",
    tone: strategy?.tone?.trim() || "",
    callToAction: strategy?.callToAction?.trim() || "",
    differentiator: strategy?.differentiator?.trim() || "",
    proofPoints: strategy?.proofPoints?.trim() || "",
    originalityAngle: strategy?.originalityAngle?.trim() || "",
    objections: strategy?.objections?.trim() || "",
  };
}

function topicList(
  strategy: MonthlyCampaignStrategyInput,
  marketingSpine?: MarketingSpine | null,
) {
  const explicitTopics = strategy.keyTopics
    ? strategy.keyTopics
        .split(/\n|,/)
        .map((topic) => topic.trim())
        .filter(Boolean)
    : [];

  return explicitTopics.length
    ? explicitTopics
    : (marketingSpine?.contentPillars ?? []);
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function topicForWeek(
  strategy: MonthlyCampaignStrategyInput,
  weekNumber: number,
  marketingSpine?: MarketingSpine | null,
) {
  const topics = topicList(strategy, marketingSpine);

  if (topics.length) {
    return topics[(weekNumber - 1) % topics.length];
  }

  const defaults = [
    "customer problem awareness",
    "service value and trust",
    "seasonal timing",
    "common objections",
    "next step and offer reminder",
  ];

  return defaults[(weekNumber - 1) % defaults.length];
}

function publicTitleForTopic(
  topic: string,
  strategy: MonthlyCampaignStrategyInput,
) {
  const safeTopic = titleCase(simpleNounPhrase(topic, "better marketing visibility"));
  const audience = titleCase(simpleNounPhrase(strategy.targetAudience, "business owners"));

  if (/ai|search|seo|aio|visibility/i.test(safeTopic)) {
    return `Why ${safeTopic} Matters for ${audience}`;
  }

  if (/content|message|blog|social/i.test(safeTopic)) {
    return `How Better ${safeTopic} Builds Trust`;
  }

  if (/lead|sales|growth|pipeline/i.test(safeTopic)) {
    return `Turning ${safeTopic} Into Better Conversations`;
  }

  return `A Practical Guide to ${safeTopic}`;
}

function internalCampaignName({
  month,
  weekNumber,
  campaignTheme,
  strategy,
  marketingSpine,
}: {
  month: string;
  weekNumber: number;
  campaignTheme?: string;
  strategy: MonthlyCampaignStrategyInput;
  marketingSpine?: MarketingSpine | null;
}) {
  const baseTheme =
    campaignTheme?.trim() ||
    marketingSpine?.campaignTheme ||
    "Authority Growth";
  const topic = topicForWeek(strategy, weekNumber, marketingSpine);

  return `${monthLabel(month)} Week ${weekNumber}: ${baseTheme} — ${topic}`;
}

function publicCampaignAngle({
  weekNumber,
  strategy,
  marketingSpine,
}: {
  weekNumber: number;
  strategy: MonthlyCampaignStrategyInput;
  marketingSpine?: MarketingSpine | null;
}) {
  const topic = topicLabel(strategy, weekNumber, marketingSpine);
  const audience = audienceLabel(strategy, marketingSpine);
  const offer = offerLabel(strategy, marketingSpine);

  const angles = [
    `This week's campaign helps ${audience} understand ${topic} in plain language before pointing them toward ${offer}.`,
    `The goal is to make ${topic} easier to understand, easier to trust, and easier to act on.`,
    `This message should connect a recognizable buyer problem to a practical next step without sounding like a generic service pitch.`,
    `A strong campaign this week should help the reader see what is happening, why it matters, and what they can do next.`,
    `The content should build trust by explaining the problem first, then positioning ${offer} as the natural next move.`,
  ];

  return angles[(weekNumber - 1) % angles.length];
}

function privateGenerationPrompt({
  month,
  weekNumber,
  campaignName,
  publicTitle,
  campaignAngle,
  businessContext,
  strategy,
  marketingSpine,
}: {
  month: string;
  weekNumber: number;
  campaignName: string;
  publicTitle: string;
  campaignAngle: string;
  businessContext?: string;
  strategy: MonthlyCampaignStrategyInput;
  marketingSpine?: MarketingSpine | null;
}) {
  return [
    "PRIVATE GENERATION BRIEF — DO NOT PRINT THIS BRIEF IN THE FINAL CONTENT.",
    "",
    `Internal Month: ${month}`,
    `Internal Campaign: ${campaignName}`,
    `Internal Week: ${weekNumber}`,
    `Public Title Direction: ${publicTitle}`,
    "",
    "Use the following strategy inputs to guide the angle, examples, offer positioning, and CTA.",
    marketingSpine ? formatMarketingSpineForPrompt(marketingSpine) : "",
    "",
    buildGenerationPromptDoctrineSection(["blog", "email", "linkedin", "facebook", "video", "visual"]),
    "Do not publish these labels, raw notes, internal month, campaign name, week number, or planning identifiers in the content.",
    "",
    strategy.monthlyObjective
      ? `Monthly Objective: ${strategy.monthlyObjective}`
      : "",
    strategy.targetAudience
      ? `Target Audience: ${strategy.targetAudience}`
      : "",
    strategy.primaryOffer ? `Primary Offer: ${strategy.primaryOffer}` : "",
    strategy.keyTopics
      ? `Key Topics / Weekly Angles: ${strategy.keyTopics}`
      : "",
    strategy.tone ? `Brand Tone: ${strategy.tone}` : "",
    strategy.differentiator ? `Differentiator: ${strategy.differentiator}` : "",
    strategy.callToAction ? `Call To Action: ${strategy.callToAction}` : "",
    strategy.proofPoints
      ? `Proof Points / Supporting Context: ${strategy.proofPoints}`
      : "",
    businessContext?.trim()
      ? `Additional Business Context: ${businessContext.trim()}`
      : "",
    "",
    "Public-facing campaign angle:",
    campaignAngle,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function cta(strategy: MonthlyCampaignStrategyInput) {
  return strategy.callToAction || "Schedule a marketing audit.";
}

const HASHTAG_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "how",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "not",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "with",
  "you",
  "your",
]);

const BAD_PUBLIC_CONTEXT_PATTERN = /\b(?:preferred business outcome|desired outcome|primary outcome|selected audience|selected offer|selected service|audience context|offer details|proof points?|supporting context|business context|additional context|content angle|marketing spine|strategy input|campaign brief|raw context|internal month|internal campaign|week number|practical proof|context point|asset brief)\b/i;

const CONTEXT_LABEL_PREFIX_PATTERN = /^(?:selected service line|selected audience|selected offer|service context|primary outcome|audience context|audience pain points?|desired outcomes?|common objections?|offer details?|offer outcome|price\/package notes?|proof points?|supporting context|business context|additional business context|target audience|primary offer|brand tone|monthly objective|key topics?|differentiator|call to action|cta)\s*:\s*/i;

function stripContextLabel(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/^[-•*]\s+/, "")
    .replace(CONTEXT_LABEL_PREFIX_PATTERN, "")
    .replace(/^selected\s+[^—:]+\s+—\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelySentence(value: string) {
  const cleaned = stripContextLabel(value);

  if (!cleaned) return false;
  if (/[.!?]$/.test(cleaned)) return true;
  if (cleaned.split(/\s+/).length > 7) return true;

  return /\b(?:needs?|wants?|struggles?|looking|trying|believes?|feels?|receive|solve|outcome|contract|retainer|report|recommendations?)\b/i.test(cleaned);
}

function isPublicContextCandidate(value: string) {
  const cleaned = stripContextLabel(value);

  if (!cleaned) return false;
  if (/^(not supplied|not provided|none|n\/a)$/i.test(cleaned)) return false;
  if (BAD_PUBLIC_CONTEXT_PATTERN.test(cleaned)) return false;

  return true;
}

function contextNuggets(value: unknown, limit = 4) {
  return String(value ?? "")
    .split(/\r?\n|\s*[|•]\s*|;/g)
    .map(stripContextLabel)
    .filter(isPublicContextCandidate)
    .filter((item, index, array) => {
      const key = item.toLowerCase();
      return array.findIndex((compare) => compare.toLowerCase() === key) === index;
    })
    .slice(0, limit);
}

function firstContextNugget(value: unknown, fallback: string) {
  return contextNuggets(value, 1)[0] || stripContextLabel(fallback);
}

function sentenceCase(value: string) {
  const cleaned = stripContextLabel(value)
    .replace(/\bai\b/gi, "AI")
    .replace(/\bseo\b/gi, "SEO")
    .replace(/\baio\b/gi, "AIO")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

function completeSentence(value: string, fallback: string) {
  const source = isPublicContextCandidate(value) ? value : fallback;
  const cleaned = sentenceCase(source);

  if (!cleaned) return "";
  if (/[.!?]$/.test(cleaned)) return cleaned;

  return `${cleaned}.`;
}

function simpleNounPhrase(value: unknown, fallback: string) {
  const cleaned = stripContextLabel(value);
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (!cleaned) return fallback;
  if (BAD_PUBLIC_CONTEXT_PATTERN.test(cleaned)) return fallback;
  if (isLikelySentence(cleaned)) return fallback;
  if (words.length > 5) return fallback;

  return cleaned;
}

function lowercaseFirst(value: string) {
  if (!value) return value;
  if (/^[A-Z]{2,}$/.test(value)) return value;

  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function audienceLabel(strategy: MonthlyCampaignStrategyInput, marketingSpine?: MarketingSpine | null) {
  return lowercaseFirst(
    simpleNounPhrase(
      marketingSpine?.audience || strategy.targetAudience,
      "the right buyers",
    ),
  );
}

function offerLabel(strategy: MonthlyCampaignStrategyInput, marketingSpine?: MarketingSpine | null) {
  const raw = simpleNounPhrase(
    marketingSpine?.offer || strategy.primaryOffer,
    "a practical next step",
  );

  if (/^free\s+/i.test(raw)) {
    return `a ${lowercaseFirst(raw)}`;
  }

  if (/^(a|an|the)\s+/i.test(raw)) {
    return lowercaseFirst(raw);
  }

  return lowercaseFirst(raw);
}

function topicLabel(
  strategy: MonthlyCampaignStrategyInput,
  weekNumber: number,
  marketingSpine?: MarketingSpine | null,
) {
  return lowercaseFirst(
    simpleNounPhrase(
      topicForWeek(strategy, weekNumber, marketingSpine),
      "better marketing visibility",
    ),
  );
}

function proofLabel(strategy: MonthlyCampaignStrategyInput, marketingSpine?: MarketingSpine | null) {
  const proof = firstContextNugget(
    marketingSpine?.proofPoints?.[0] || strategy.proofPoints,
    "a clearer view of what is working, what is missing, and what to fix first",
  );

  if (!isLikelySentence(proof) && proof.split(/\s+/).length <= 8) {
    return lowercaseFirst(proof);
  }

  return "a clearer view of what is working, what is missing, and what to fix first";
}

function objectionLabel(strategy: MonthlyCampaignStrategyInput, marketingSpine?: MarketingSpine | null) {
  const objection = firstContextNugget(
    marketingSpine?.objections?.[0] || strategy.objections,
    "not knowing whether the next marketing move is worth the time or budget",
  );

  if (BAD_PUBLIC_CONTEXT_PATTERN.test(objection)) {
    return "not knowing whether the next marketing move is worth the time or budget";
  }

  return lowercaseFirst(objection.replace(/[.!?]$/, ""));
}

function normalizeCta(value: string) {
  const cleaned = stripContextLabel(value)
    .replace(/\bSCHEDULE\b/g, "Schedule")
    .replace(/\bBOOK\b/g, "Book")
    .replace(/\bGET\b/g, "Get")
    .replace(/\bDOWNLOAD\b/g, "Download")
    .replace(/\bMARKETING\b/g, "marketing")
    .replace(/\bAUDIT\b/g, "audit")
    .replace(/\s+/g, " ")
    .trim();

  return completeSentence(cleaned, "Schedule a marketing audit.");
}

function humanBuyerProblem({
  topic,
  audience,
  offer,
  buyerPain,
}: {
  topic: string;
  audience: string;
  offer: string;
  buyerPain: string;
}) {
  const combined = `${topic} ${audience} ${offer} ${buyerPain}`.toLowerCase();

  if (/contractor|construction|trades?/.test(combined)) {
    return "they are trying to win better-fit jobs without wasting time or money on marketing that never turns into real conversations";
  }

  if (/audit|visibility|search|seo|aio|ai|google/.test(combined)) {
    return "it is hard to know why they are not showing up in the right searches or what to fix first";
  }

  if (/lead|sales|pipeline/.test(combined)) {
    return "the problem is not just getting attention; it is turning that attention into a real sales conversation";
  }

  if (/email|nurture|follow/.test(combined)) {
    return "good prospects often need a clear reason to respond before they are ready for a sales conversation";
  }

  if (buyerPain && !BAD_PUBLIC_CONTEXT_PATTERN.test(buyerPain) && !isLikelySentence(buyerPain)) {
    return `they are trying to make sense of ${lowercaseFirst(buyerPain)}`;
  }

  return "they need a clearer way to understand the problem, compare their options, and choose a next step";
}

function humanOutcome({
  offer,
  proof,
}: {
  offer: string;
  proof: string;
}) {
  if (/audit|visibility/.test(`${offer} ${proof}`.toLowerCase())) {
    return "a short list of practical recommendations they can understand and act on";
  }

  if (/consult|call|strategy/.test(offer.toLowerCase())) {
    return "a practical conversation about what to fix first";
  }

  return proof || "a clearer path from interest to action";
}

function socialEmojiSet({
  topic,
  assetType,
}: {
  topic: string;
  assetType: string;
}) {
  const lower = topic.toLowerCase();
  const base = lower.includes("search") || lower.includes("visibility") || lower.includes("audit") || lower.includes("ai") || lower.includes("seo")
    ? ["🔎"]
    : lower.includes("lead") || lower.includes("sales") || lower.includes("growth")
      ? ["📈"]
      : ["💡"];

  if (assetType === "linkedin_post") {
    base.push("🤝");
  }

  if (assetType === "facebook_post") {
    base.push("✅");
  }

  return uniqueValues(base).slice(0, 2).join(" ");
}

function hashtagFromPhrase(value: string) {
  const cleaned = stripContextLabel(value)
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || BAD_PUBLIC_CONTEXT_PATTERN.test(cleaned) || isLikelySentence(cleaned)) return "";

  const words = cleaned
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => word.length > 2)
    .filter((word) => !HASHTAG_STOP_WORDS.has(word.toLowerCase()))
    .slice(0, 3);

  if (!words.length) return "";

  return `#${words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")}`;
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned = value.trim();
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function fixedSocialHashtags({
  strategy,
  topic,
  assetType,
}: {
  strategy: MonthlyCampaignStrategyInput;
  topic: string;
  assetType: string;
}) {
  const text = [
    topic,
    strategy.primaryOffer,
    strategy.differentiator,
    strategy.targetAudience,
    strategy.keyTopics,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const inferredTags: string[] = [];

  if (/contractor|construction|trade|trades/i.test(text)) {
    inferredTags.push("#ContractorMarketing");
  }

  if (/ai|aio|search|visibility|google|seo/i.test(text)) {
    inferredTags.push("#AIOptimization", "#LocalSEO");
  }

  if (/audit|visibility audit|marketing audit/i.test(text)) {
    inferredTags.push("#MarketingAudit");
  }

  if (/content|blog|post|social/i.test(text)) {
    inferredTags.push("#ContentMarketing");
  }

  if (/lead|retainer|contract|sales|pipeline|growth/i.test(text)) {
    inferredTags.push("#LeadGeneration");
  }

  const channelTag =
    assetType === "linkedin_post" ? "#BusinessGrowth" : "#LocalBusiness";

  const safeTopicTag = hashtagFromPhrase(topic);

  return uniqueValues([
    safeTopicTag,
    ...inferredTags,
    "#WebSearchPros",
    "#DigitalMarketing",
    channelTag,
  ])
    .slice(0, assetType === "linkedin_post" ? 5 : 4)
    .join(" ");
}

function contentForAsset({
  assetType,
  publicTitle,
  campaignAngle,
  label,
  strategy,
  weekNumber,
  marketingSpine,
}: {
  assetType: string;
  publicTitle: string;
  campaignAngle: string;
  label: string;
  strategy: MonthlyCampaignStrategyInput;
  weekNumber: number;
  marketingSpine?: MarketingSpine | null;
}): string {
  const callToAction = normalizeCta(
    firstContextNugget(
      marketingSpine?.primaryCta || cta(strategy),
      "Schedule a marketing audit.",
    ),
  );
  const topic = topicLabel(strategy, weekNumber, marketingSpine);
  const offer = offerLabel(strategy, marketingSpine);
  const audience = audienceLabel(strategy, marketingSpine);
  const rawPain = firstContextNugget(
    marketingSpine?.buyerPain || strategy.proofPoints,
    "",
  );
  const proof = proofLabel(strategy, marketingSpine);
  const objection = objectionLabel(strategy, marketingSpine);
  const buyerProblem = humanBuyerProblem({
    topic,
    audience,
    offer,
    buyerPain: rawPain,
  });
  const outcome = humanOutcome({ offer, proof });
  const humanAngle = completeSentence(
    campaignAngle && !BAD_PUBLIC_CONTEXT_PATTERN.test(campaignAngle)
      ? campaignAngle
      : "A stronger message helps people understand what is happening, why it matters, and what to do next.",
    "A stronger message helps people understand what is happening, why it matters, and what to do next.",
  );

  switch (assetType) {
    case "blog_post":
      return [
        `# ${publicTitle}`,
        "",
        "Most people do not act because a business has a service to sell. They act when the problem becomes clear enough to understand and the next step feels safe enough to take.",
        "",
        humanAngle,
        "",
        `For ${audience}, the challenge is usually simple: ${buyerProblem}. That is why content about ${topic} has to do more than announce an offer. It has to help the reader recognize the problem in plain language and see a practical way forward.`,
        "",
        "## What the reader needs to understand",
        "A useful article should answer the questions the buyer is already asking quietly:",
        "",
        "- What is actually holding us back?",
        "- What should we look at first?",
        "- What would a realistic next step look like?",
        "- How do we avoid wasting time on the wrong fix?",
        "",
        `That is where ${offer} can become useful. The offer should not feel like a hard sell. It should feel like a practical way to get ${outcome}.`,
        "",
        "## Why generic messaging falls flat",
        "Generic content usually talks about the service too soon. It says what the business does before it proves that the business understands the customer’s situation.",
        "",
        `A better message starts with the real concern: ${objection}. When the content addresses that concern directly, the reader has a reason to keep going.`,
        "",
        "## A better way to frame the conversation",
        `Start with the problem behind ${topic}. Explain what the buyer may be missing, what the consequence is, and what they can do next. Then connect that explanation to ${offer} as the natural next step.`,
        "",
        "This approach makes the content more useful, more believable, and easier to act on. It also keeps the message from sounding like every other business making the same claim.",
        "",
        "## Practical next step",
        `If this is already on your mind, the next move is not to guess. ${callToAction}`,
      ].join("\n");

    case "linkedin_post":
      return [
        `${socialEmojiSet({ topic, assetType })} Most buyers do not need another generic marketing pitch.`,
        "",
        "They need a clear explanation of the problem they are already trying to solve.",
        "",
        `For ${audience}, ${buyerProblem}. That is the part good content has to make simple.`,
        "",
        `The offer matters, but only after the reader understands why it is useful. That is where ${offer} can help: it gives them ${outcome}.`,
        "",
        "The goal is not to sound clever. The goal is to make the next decision easier.",
        "",
        callToAction,
        "",
        fixedSocialHashtags({ strategy, topic, assetType }),
      ].join("\n");

    case "facebook_post":
      return [
        `${socialEmojiSet({ topic, assetType })} Quick thought for business owners:`,
        "",
        "Your best marketing message usually is not the thing you want to say first.",
        "",
        "It is the thing your customer needs to understand before they are ready to act.",
        "",
        `For ${audience}, ${buyerProblem}. A helpful message explains that in plain language, answers the obvious concern, and points to one easy next step.`,
        "",
        `That is the role of ${offer}: helping people get ${outcome}.`,
        "",
        callToAction,
        "",
        fixedSocialHashtags({ strategy, topic, assetType }),
      ].join("\n");

    case "email":
      return [
        `Subject: ${publicTitle}`,
        `Preview: A practical way to think about ${topic}.`,
        "",
        "Hi there,",
        "",
        `A lot of marketing gets ignored because it starts with the service instead of the problem. For ${audience}, the real issue is often that ${buyerProblem}.`,
        "",
        `That is why ${topic} needs to be explained in everyday language. The reader should be able to understand what is happening, what it may be costing them, and what they can do next.`,
        "",
        `A practical next step is ${offer}, especially if the goal is to get ${outcome}.`,
        "",
        callToAction,
        "",
        "Best,",
        "The Team",
      ].join("\n");

    case "video_script":
      return [
        `${publicTitle}`,
        "",
        "20-second video script:",
        "",
        "Hook: Most marketing fails when it talks about the service before it explains the customer’s problem.",
        "",
        `Problem: For ${audience}, ${buyerProblem}.`,
        "",
        `Solution: Make the problem easy to understand, then connect it to ${offer} as the next practical step.`,
        "",
        `Close: ${callToAction}`,
      ].join("\n");

    case "galaxyai_prompt":
      return buildGalaxyAiPromptFromVideoScript({
        title: publicTitle,
        videoScript: contentForAsset({
          assetType: "video_script",
          publicTitle,
          campaignAngle,
          label: "Friday video script",
          strategy,
          weekNumber,
          marketingSpine,
        }),
        campaignAngle,
        callToAction,
        audience,
      });

    default:
      return `${label}: ${humanAngle}`;
  }
}

export function buildMonthlyCampaignPlan(
  input: MonthlyCampaignPlanInput,
): WeeklyCampaignPlan[] {
  const weeks = campaignWeeksForMonth(input.month);
  const strategy = cleanStrategy(input.strategy);
  const marketingSpine = input.marketingSpine ?? null;

  return weeks.map((week) => {
    const publicTopic = topicForWeek(strategy, week.weekNumber, marketingSpine);
    const publicTitle = publicTitleForTopic(publicTopic, strategy);

    const campaignName = internalCampaignName({
      month: input.month,
      weekNumber: week.weekNumber,
      campaignTheme: input.campaignTheme,
      strategy,
      marketingSpine,
    });

    const campaignAngle = publicCampaignAngle({
      weekNumber: week.weekNumber,
      strategy,
      marketingSpine,
    });

    const generationPrompt = privateGenerationPrompt({
      month: input.month,
      weekNumber: week.weekNumber,
      campaignName,
      publicTitle,
      campaignAngle,
      businessContext: input.businessContext,
      strategy,
      marketingSpine,
    });

    return {
      weekNumber: week.weekNumber,
      campaignName,
      publicTopic,
      publicTitle,
      campaignAngle,
      generationPrompt,
      strategy,
      marketingSpine,
      weekStartDate: dateKey(week.start),
      weekEndDate: dateKey(week.end),
      assets: (() => {
        const videoScriptContent = contentForAsset({
          assetType: "video_script",
          publicTitle,
          campaignAngle,
          label: "Friday video script",
          strategy,
          weekNumber: week.weekNumber,
          marketingSpine,
        });

        const campaignVisualDirectionContent = buildCampaignVisualDirection({
          publicTitle,
          campaignAngle,
          businessContext: input.businessContext,
          strategy,
        });

        return WEEKLY_CAMPAIGN_ASSET_BLUEPRINT.map((slot) => {
          const publishDate = addDays(week.start, slot.dayOffset);
          const scheduledAt = setLocalTime(publishDate, slot.hour, slot.minute);
          const label = slot.label;
          const sourceSocialAssetType = slot.sourceAssetType;
          const sourceSocialPostContent = sourceSocialAssetType
            ? contentForAsset({
                assetType: sourceSocialAssetType,
                publicTitle,
                campaignAngle,
                label: label.replace(/ image prompt$/i, " post"),
                strategy,
                weekNumber: week.weekNumber,
                marketingSpine,
              })
            : "";

          const content =
            slot.assetType === "campaign_visual_direction"
              ? campaignVisualDirectionContent
              : slot.assetType === "galaxyai_image_prompt" &&
                  sourceSocialAssetType
                ? buildGalaxyAiSocialImagePrompt({
                    platform:
                      sourceSocialAssetType === "linkedin_post"
                        ? "linkedin"
                        : "facebook",
                    publicTitle,
                    campaignAngle,
                    campaignVisualDirection: campaignVisualDirectionContent,
                    postCopy: sourceSocialPostContent,
                    strategy,
                  })
                : slot.assetType === "galaxyai_prompt"
                  ? buildGalaxyAiPromptFromVideoScript({
                      title: publicTitle,
                      videoScript: videoScriptContent,
                      campaignAngle,
                      callToAction: marketingSpine?.primaryCta || cta(strategy),
                      audience:
                        marketingSpine?.audience || strategy.targetAudience,
                    })
                  : slot.assetType === "video_script"
                    ? videoScriptContent
                    : contentForAsset({
                        assetType: slot.assetType,
                        publicTitle,
                        campaignAngle,
                        label,
                        strategy,
                        weekNumber: week.weekNumber,
                        marketingSpine,
                      });

          const assetBrief = buildMarketingSpineAssetBrief({
            assetType: slot.assetType,
            assetLabel: label,
            publicTitle,
            publicTopic,
            weekNumber: week.weekNumber,
            marketingSpine,
          });

          const baseMetadata = {
            marketingSpine: marketingSpine
              ? marketingSpineSummary(marketingSpine)
              : null,
            assetBrief,
            strategyInheritancePath: marketingSpine?.inheritancePath ?? [
              "Campaign strategy",
              "Asset brief",
              "Asset creation",
              "Quality review",
              "Publishing preflight",
            ],
          };

          const metadata =
            slot.assetType === "campaign_visual_direction"
              ? {
                  ...baseMetadata,
                  visualAssetRole: "weekly_campaign_visual_direction",
                  appliesToAssetTypes: [
                    "linkedin_post",
                    "facebook_post",
                    "galaxyai_image_prompt",
                  ],
                }
              : slot.assetType === "galaxyai_image_prompt"
                ? {
                    ...baseMetadata,
                    visualAssetRole: "social_image_prompt",
                    galaxyAiImagePrompt: true,
                    sourceSocialAssetType,
                    sourceSocialAssetSortOrder: slot.sourceSortOrder ?? null,
                    imagePlatform:
                      sourceSocialAssetType === "linkedin_post"
                        ? "linkedin"
                        : "facebook",
                    imageFormat: "square_1200x1200",
                    requiresHumanReviewBeforeGalaxyAiRun: true,
                    artifactReviewInstruction:
                      "Review the output at least three times for artifacts, distorted people, malformed text, fake metrics, and mismatched objects before accepting the generated image.",
                  }
                : baseMetadata;

          return {
            assetType: slot.assetType,
            title:
              slot.assetType === "campaign_visual_direction"
                ? `${publicTitle} — Weekly visual direction`
                : slot.assetType === "galaxyai_image_prompt"
                  ? `${publicTitle} — ${sourceSocialAssetType === "linkedin_post" ? "LinkedIn" : "Facebook"} image prompt`
                  : slot.assetType === "galaxyai_prompt"
                    ? `${publicTitle} — GalaxyAI video prompt`
                    : `${publicTitle} — ${assetTypeLabel(slot.assetType)}`,
            content,
            metadata,
            generationPrompt: [
              generationPrompt,
              "",
              `Asset Type: ${slot.assetType}`,
              `Asset Slot: ${label}`,
              `Asset Brief: ${JSON.stringify(assetBrief)}`,
              slot.assetType === "campaign_visual_direction"
                ? "Create the shared weekly visual direction for all campaign social images."
                : slot.assetType === "galaxyai_image_prompt"
                  ? "Create a production-ready GalaxyAI social image prompt that supports the companion social post. Do not generate or publish the image automatically."
                  : slot.assetType === "galaxyai_prompt"
                    ? "Create a production-ready GalaxyAI video prompt from the companion Friday video script. Only this prompt asset should be sent to GalaxyAI after approval."
                    : "Generate public-facing content only.",
              "Do not include the private brief, raw strategy labels, internal month, campaign name, week number, or planning notes.",
            ].join("\n"),
            plannedPublishDate: dateKey(publishDate),
            scheduledPublishAt: scheduledAt.toISOString(),
            sortOrder: slot.sortOrder,
            calendarNotes:
              slot.assetType === "campaign_visual_direction"
                ? `${label}. Shared visual system for this campaign week. Use it to keep image prompts consistent across platforms.`
                : slot.assetType === "galaxyai_image_prompt"
                  ? `${label}. Companion GalaxyAI image prompt for the matching ${sourceSocialAssetType === "linkedin_post" ? "LinkedIn" : "Facebook"} post. Review and approve before sending to GalaxyAI.`
                  : slot.assetType === "galaxyai_prompt"
                    ? `${label}. Companion GalaxyAI prompt generated from the Friday video script. Review and approve this prompt before sending it to GalaxyAI.`
                    : `${label}. Generated as part of weekly campaign package.`,
          };
        });
      })(),
    };
  });
}
