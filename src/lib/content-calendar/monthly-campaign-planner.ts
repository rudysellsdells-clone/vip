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
  const audience = strategy.targetAudience || "local businesses";

  if (/ai|search/i.test(topic)) {
    return `Why ${titleCase(topic)} Matters for ${audience}`;
  }

  if (/content/i.test(topic)) {
    return `How Better ${titleCase(topic)} Builds Trust`;
  }

  if (/lead|sales|growth/i.test(topic)) {
    return `Turning ${titleCase(topic)} Into Better Opportunities`;
  }

  return `A Practical Guide to ${titleCase(topic)}`;
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
  const topic = topicForWeek(strategy, weekNumber, marketingSpine);
  const audience =
    marketingSpine?.audience ||
    strategy.targetAudience ||
    "the right customers";
  const offer =
    marketingSpine?.offer || strategy.primaryOffer || "the right next step";
  const differentiator =
    strategy.differentiator ||
    marketingSpine?.positioningAngle ||
    "a practical service plan";
  const originality =
    marketingSpine?.originalityAngle || strategy.originalityAngle || "";
  const buyerPain = marketingSpine?.buyerPain || topic;

  const angles = [
    originality
      ? `${originality} This week turns that point of view into useful content around ${topic}.`
      : "",
    buyerPain
      ? `${audience} are dealing with ${buyerPain}. This week shows why that matters and how ${offer} creates a practical next step.`
      : "",
    `${audience} are paying closer attention to ${topic}, and the service businesses that explain it clearly are more likely to earn trust before the first conversation.`,
    `Improving how people understand ${topic} does not have to be complicated. The right plan connects helpful education, clear proof, and a simple next step for the customer.`,
    `Many businesses waste time creating disconnected content. A better approach is to use ${topic} as the weekly anchor and turn it into useful posts, emails, and video ideas.`,
    `${topic} works best when it gives people a simple reason to act. That is where ${differentiator} can turn attention into real opportunities.`,
    `A strong month of content should not feel random. It should reinforce the same message, build confidence, and point people toward ${offer}.`,
  ];

  const usableAngles = angles.filter(Boolean);
  return usableAngles[(weekNumber - 1) % usableAngles.length];
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
  return strategy.callToAction || "Reach out to learn the best next step.";
}

function publicOfferPhrase(strategy: MonthlyCampaignStrategyInput) {
  return strategy.primaryOffer || "the recommended next step";
}

function hashtagFromPhrase(value: string) {
  const words = value
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter(
      (word) =>
        !["and", "the", "for", "with", "from", "this", "that"].includes(
          word.toLowerCase(),
        ),
    )
    .slice(0, 4);

  if (!words.length) return "";

  return `#${words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")}`;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}


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

function contextNuggets(value: unknown, limit = 4) {
  return String(value ?? "")
    .split(/\r?\n|\s*[|•]\s*|;/g)
    .map(stripContextLabel)
    .filter(Boolean)
    .filter((item) => !/^(not supplied|not provided|none|n\/a)$/i.test(item))
    .filter((item, index, array) => {
      const key = item.toLowerCase();
      return array.findIndex((compare) => compare.toLowerCase() === key) === index;
    })
    .slice(0, limit);
}

function firstContextNugget(value: unknown, fallback: string) {
  return contextNuggets(value, 1)[0] || stripContextLabel(fallback);
}

function naturalList(values: string[], fallback: string) {
  const cleanValues = values.map(stripContextLabel).filter(Boolean).slice(0, 3);

  if (!cleanValues.length) return fallback;
  if (cleanValues.length === 1) return cleanValues[0];
  if (cleanValues.length === 2) return `${cleanValues[0]} and ${cleanValues[1]}`;

  return `${cleanValues[0]}, ${cleanValues[1]}, and ${cleanValues[2]}`;
}

function audiencePhrase(strategy: MonthlyCampaignStrategyInput, marketingSpine?: MarketingSpine | null) {
  return firstContextNugget(
    marketingSpine?.audience || strategy.targetAudience,
    "the intended audience",
  );
}

function offerPhrase(strategy: MonthlyCampaignStrategyInput, marketingSpine?: MarketingSpine | null) {
  return firstContextNugget(
    marketingSpine?.offer || strategy.primaryOffer,
    "the recommended next step",
  );
}

function proofPhrase(strategy: MonthlyCampaignStrategyInput, marketingSpine?: MarketingSpine | null) {
  return firstContextNugget(
    marketingSpine?.proofPoints?.[0] || strategy.proofPoints,
    "a practical detail from the service or offer",
  );
}

function objectionPhrase(strategy: MonthlyCampaignStrategyInput, marketingSpine?: MarketingSpine | null) {
  return firstContextNugget(
    marketingSpine?.objections?.[0] || strategy.objections,
    "the concern that this may not be urgent enough right now",
  );
}

function buyerPainPhrase({
  topic,
  strategy,
  marketingSpine,
}: {
  topic: string;
  strategy: MonthlyCampaignStrategyInput;
  marketingSpine?: MarketingSpine | null;
}) {
  return firstContextNugget(
    marketingSpine?.buyerPain || strategy.proofPoints,
    `${audiencePhrase(strategy, marketingSpine)} needs a clearer way to understand and act on ${topic}.`,
  );
}

function contextToPublicSentence(value: unknown, fallback: string) {
  const nuggets = contextNuggets(value, 2);
  return naturalList(nuggets, fallback);
}

function topicEmoji(topic: string) {
  const lower = topic.toLowerCase();

  if (lower.includes("ai") || lower.includes("search")) return "🔎";
  if (lower.includes("local") || lower.includes("google")) return "📍";
  if (lower.includes("content") || lower.includes("blog")) return "✍️";
  if (
    lower.includes("lead") ||
    lower.includes("sales") ||
    lower.includes("growth")
  )
    return "📈";
  if (lower.includes("authority") || lower.includes("trust")) return "🏆";
  if (lower.includes("video")) return "🎥";
  if (lower.includes("email")) return "📬";
  if (lower.includes("review")) return "⭐";
  if (lower.includes("strategy")) return "🧭";

  return "💡";
}

function socialEmojiSet({
  topic,
  assetType,
}: {
  topic: string;
  assetType: string;
}) {
  const base = [topicEmoji(topic)];

  if (assetType === "linkedin_post") {
    base.push("📈", "🤝");
  }

  if (assetType === "facebook_post") {
    base.push("📣", "✅");
  }

  return uniqueValues(base).slice(0, 3).join(" ");
}

function socialHashtags({
  strategy,
  topic,
  assetType,
}: {
  strategy: MonthlyCampaignStrategyInput;
  topic: string;
  assetType: string;
}) {
  const topicTags = topicList(strategy).map(hashtagFromPhrase);

  const defaults = [
    hashtagFromPhrase(topic),
    strategy.primaryOffer ? hashtagFromPhrase(strategy.primaryOffer) : "",
    strategy.differentiator ? hashtagFromPhrase(strategy.differentiator) : "",
    strategy.targetAudience ? hashtagFromPhrase(strategy.targetAudience) : "",
    "#ServiceBusiness",
  ];

  const channelTag =
    assetType === "linkedin_post" ? "#BusinessGrowth" : "#LocalBusiness";

  return uniqueValues([...topicTags, ...defaults, channelTag])
    .slice(0, assetType === "linkedin_post" ? 6 : 5)
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
  const callToAction = firstContextNugget(
    marketingSpine?.primaryCta || cta(strategy),
    "Reach out to learn the best next step.",
  );
  const topic = firstContextNugget(
    topicForWeek(strategy, weekNumber, marketingSpine),
    "the campaign topic",
  );
  const offer = offerPhrase(strategy, marketingSpine);
  const audience = audiencePhrase(strategy, marketingSpine);
  const buyerPain = buyerPainPhrase({ topic, strategy, marketingSpine });
  const originalityAngle = contextToPublicSentence(
    marketingSpine?.originalityAngle || strategy.originalityAngle || campaignAngle,
    campaignAngle,
  );
  const proofPoint = proofPhrase(strategy, marketingSpine);
  const objection = objectionPhrase(strategy, marketingSpine);
  const practicalExample = contextToPublicSentence(
    strategy.differentiator || marketingSpine?.positioningAngle,
    `a clear connection between ${buyerPain} and ${offer}`,
  );

  switch (assetType) {
    case "blog_post":
      return [
        `# ${publicTitle}`,
        "",
        "## Why this matters",
        `${campaignAngle}`,
        "",
        `For ${audience}, this usually shows up as a practical problem: ${buyerPain}. When that problem is left alone, people may still need the service, but they do not have a clear enough reason to trust the next step, compare options, or act with confidence.`,
        "",
        "## What buyers need to understand first",
        `The useful starting point is not to repeat the offer word-for-word. It is to explain the situation the buyer is already trying to solve, then connect that situation to ${offer}. A strong message around ${topic} should make the problem easier to recognize, easier to understand, and easier to act on.`,
        "",
        `One practical angle to keep in view is ${practicalExample}. That gives the content a real point of view instead of sounding like a copied service description.`,
        "",
        "## How to turn the context into useful content",
        "A useful article should translate the available audience, offer, and market details into plain-language guidance, examples, and decision support.",
        "",
        `A simple way to do that is to focus each section on one question: what the buyer is worried about, what they may misunderstand, what proof or process detail helps them decide, and why ${offer} is a reasonable next step.`,
        "",
        "## Common concern to address",
        `A likely concern is ${objection}. The content should answer that concern directly with context, explanation, and useful next steps instead of making a broad claim.`,
        "",
        "## Practical next step",
        `If ${topic} is already on the buyer's mind, the next step is to make the decision easier. ${callToAction}`,
      ].join("\n");

    case "linkedin_post":
      return [
        `${socialEmojiSet({ topic, assetType })} A useful marketing message starts with the customer's real problem, not a generic service pitch.`,
        "",
        originalityAngle,
        "",
        `For ${audience}, the issue is not just awareness. It is whether the message connects ${buyerPain} to a believable next step: ${offer}.`,
        "",
        `A practical proof or context point to build around: ${proofPoint}`,
        "",
        callToAction,
        "",
        socialHashtags({ strategy, topic, assetType }),
      ].join("\n");

    case "facebook_post":
      return [
        `${socialEmojiSet({ topic, assetType })} Quick thought for local businesses:`,
        "",
        campaignAngle,
        "",
        `Good content should turn the customer situation into a clear, helpful explanation of what they are dealing with and why it matters.`,
        "",
        `In this case, the helpful angle is ${buyerPain}. The concern to answer is ${objection}.`,
        "",
        callToAction,
        "",
        socialHashtags({ strategy, topic, assetType }),
      ].join("\n");

    case "email":
      return [
        `Subject: ${publicTitle}`,
        `Preview: A practical look at why ${topic} matters now.`,
        "",
        "Hi there,",
        "",
        campaignAngle,
        "",
        `If ${buyerPain} is showing up in the buyer journey, the message should help the reader understand what is happening, why it matters, and what a practical next step looks like.`,
        "",
        `The opportunity is to connect that situation to ${offer} with a clear explanation and a useful proof point: ${proofPoint}`,
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
        `Hook: Most marketing misses because it explains the service before it explains the customer problem.`,
        "",
        `Main point: ${campaignAngle}`,
        "",
        `Support: Focus on ${buyerPain}, then show how ${offer} gives the viewer a practical next step.`,
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
      return `${label}: ${campaignAngle}`;
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
