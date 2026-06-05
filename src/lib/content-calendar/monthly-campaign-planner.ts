import {
  WEEKLY_CAMPAIGN_ASSET_BLUEPRINT,
  WeeklyAssetBlueprint,
  assetTypeLabel,
} from "@/lib/content-calendar/monthly-campaign-blueprint";
import { buildGalaxyAiPromptFromVideoScript } from "@/lib/galaxyai/prompt-builder";
import {
  buildCampaignVisualDirection,
  buildGalaxyAiSocialImagePrompt,
} from "@/lib/galaxyai/image-prompt-builder";

export type MonthlyCampaignStrategyInput = {
  monthlyObjective?: string;
  targetAudience?: string;
  primaryOffer?: string;
  keyTopics?: string;
  callToAction?: string;
  differentiator?: string;
  proofPoints?: string;
};

export type MonthlyCampaignPlanInput = {
  month: string;
  businessContext?: string;
  campaignTheme?: string;
  strategy?: MonthlyCampaignStrategyInput;
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

function cleanStrategy(strategy?: MonthlyCampaignStrategyInput): MonthlyCampaignStrategyInput {
  return {
    monthlyObjective: strategy?.monthlyObjective?.trim() || "",
    targetAudience: strategy?.targetAudience?.trim() || "",
    primaryOffer: strategy?.primaryOffer?.trim() || "",
    keyTopics: strategy?.keyTopics?.trim() || "",
    callToAction: strategy?.callToAction?.trim() || "",
    differentiator: strategy?.differentiator?.trim() || "",
    proofPoints: strategy?.proofPoints?.trim() || "",
  };
}

function topicList(strategy: MonthlyCampaignStrategyInput) {
  return strategy.keyTopics
    ? strategy.keyTopics
        .split(/\n|,/)
        .map((topic) => topic.trim())
        .filter(Boolean)
    : [];
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function topicForWeek(strategy: MonthlyCampaignStrategyInput, weekNumber: number) {
  const topics = topicList(strategy);

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

function publicTitleForTopic(topic: string, strategy: MonthlyCampaignStrategyInput) {
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
}: {
  month: string;
  weekNumber: number;
  campaignTheme?: string;
  strategy: MonthlyCampaignStrategyInput;
}) {
  const baseTheme = campaignTheme?.trim() || "Authority Growth";
  const topic = topicForWeek(strategy, weekNumber);

  return `${monthLabel(month)} Week ${weekNumber}: ${baseTheme} — ${topic}`;
}

function publicCampaignAngle({
  weekNumber,
  strategy,
}: {
  weekNumber: number;
  strategy: MonthlyCampaignStrategyInput;
}) {
  const topic = topicForWeek(strategy, weekNumber);
  const audience = strategy.targetAudience || "the right customers";
  const offer = strategy.primaryOffer || "the right next step";
  const differentiator = strategy.differentiator || "a practical service plan";

  const angles = [
    `${audience} are paying closer attention to ${topic}, and the service businesses that explain it clearly are more likely to earn trust before the first conversation.`,
    `Improving how people understand ${topic} does not have to be complicated. The right plan connects helpful education, clear proof, and a simple next step for the customer.`,
    `Many businesses waste time creating disconnected content. A better approach is to use ${topic} as the weekly anchor and turn it into useful posts, emails, and video ideas.`,
    `${topic} works best when it gives people a simple reason to act. That is where ${differentiator} can turn attention into real opportunities.`,
    `A strong month of content should not feel random. It should reinforce the same message, build confidence, and point people toward ${offer}.`,
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
}: {
  month: string;
  weekNumber: number;
  campaignName: string;
  publicTitle: string;
  campaignAngle: string;
  businessContext?: string;
  strategy: MonthlyCampaignStrategyInput;
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
    "Do not publish these labels, raw notes, internal month, campaign name, week number, or planning identifiers in the content.",
    "",
    strategy.monthlyObjective ? `Monthly Objective: ${strategy.monthlyObjective}` : "",
    strategy.targetAudience ? `Target Audience: ${strategy.targetAudience}` : "",
    strategy.primaryOffer ? `Primary Offer: ${strategy.primaryOffer}` : "",
    strategy.keyTopics ? `Key Topics / Weekly Angles: ${strategy.keyTopics}` : "",
    strategy.differentiator ? `Differentiator: ${strategy.differentiator}` : "",
    strategy.callToAction ? `Call To Action: ${strategy.callToAction}` : "",
    strategy.proofPoints ? `Proof Points / Supporting Context: ${strategy.proofPoints}` : "",
    businessContext?.trim() ? `Additional Business Context: ${businessContext.trim()}` : "",
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
    .filter((word) => !["and", "the", "for", "with", "from", "this", "that"].includes(word.toLowerCase()))
    .slice(0, 4);

  if (!words.length) return "";

  return `#${words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")}`;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function topicEmoji(topic: string) {
  const lower = topic.toLowerCase();

  if (lower.includes("ai") || lower.includes("search")) return "🔎";
  if (lower.includes("local") || lower.includes("google")) return "📍";
  if (lower.includes("content") || lower.includes("blog")) return "✍️";
  if (lower.includes("lead") || lower.includes("sales") || lower.includes("growth")) return "📈";
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

  const channelTag = assetType === "linkedin_post" ? "#BusinessGrowth" : "#LocalBusiness";

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
}: {
  assetType: string;
  publicTitle: string;
  campaignAngle: string;
  label: string;
  strategy: MonthlyCampaignStrategyInput;
  weekNumber: number;
}): string {
  const callToAction = cta(strategy);
  const topic = topicForWeek(strategy, weekNumber);
  const offer = publicOfferPhrase(strategy);

  switch (assetType) {
    case "blog_post":
      return [
        `# ${publicTitle}`,
        "",
        "## Why This Matters",
        campaignAngle,
        "",
        "## What Business Owners Should Know",
        `A clear plan around ${topic} helps people understand why your service is relevant before they ever reach out.`,
        "",
        "The strongest content does not try to say everything at once. It focuses on one useful idea, explains it clearly, and connects that idea to the next step.",
        "",
        "## How to Put This Into Action",
        `Start by turning this topic into a practical message across your website, social posts, email, and video content. Keep the message useful, direct, and tied to ${offer}.`,
        "",
        "## Next Step",
        callToAction,
      ].join("\n");

    case "linkedin_post":
      return [
        `${socialEmojiSet({ topic, assetType })} ${campaignAngle}`,
        "",
        "A good campaign does more than fill the calendar. It gives the right audience a clear reason to trust you, remember you, and take the next step.",
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
        "When your content is built around one clear service idea, it becomes easier for people to understand what you do and why it matters.",
        "",
        callToAction,
        "",
        socialHashtags({ strategy, topic, assetType }),
      ].join("\n");

    case "email":
      return [
        `Subject: ${publicTitle}`,
        "",
        "Hi there,",
        "",
        campaignAngle,
        "",
        `This is a good time to look at how ${topic} supports the customer's decision and how it connects to the next step you want people to take.`,
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
        `Hook: Most service businesses do not need more random content. They need a clearer message around ${topic}.`,
        "",
        `Main point: ${campaignAngle}`,
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
        }),
        campaignAngle,
        callToAction,
        audience: strategy.targetAudience,
      });

    default:
      return `${label}: ${campaignAngle}`;
  }
}

export function buildMonthlyCampaignPlan(input: MonthlyCampaignPlanInput): WeeklyCampaignPlan[] {
  const weeks = campaignWeeksForMonth(input.month);
  const strategy = cleanStrategy(input.strategy);

  return weeks.map((week) => {
    const publicTopic = topicForWeek(strategy, week.weekNumber);
    const publicTitle = publicTitleForTopic(publicTopic, strategy);

    const campaignName = internalCampaignName({
      month: input.month,
      weekNumber: week.weekNumber,
      campaignTheme: input.campaignTheme,
      strategy,
    });

    const campaignAngle = publicCampaignAngle({
      weekNumber: week.weekNumber,
      strategy,
    });

    const generationPrompt = privateGenerationPrompt({
      month: input.month,
      weekNumber: week.weekNumber,
      campaignName,
      publicTitle,
      campaignAngle,
      businessContext: input.businessContext,
      strategy,
    });

    return {
      weekNumber: week.weekNumber,
      campaignName,
      publicTopic,
      publicTitle,
      campaignAngle,
      generationPrompt,
      strategy,
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
              })
            : "";

          const content =
            slot.assetType === "campaign_visual_direction"
              ? campaignVisualDirectionContent
              : slot.assetType === "galaxyai_image_prompt" && sourceSocialAssetType
                ? buildGalaxyAiSocialImagePrompt({
                    platform: sourceSocialAssetType === "linkedin_post" ? "linkedin" : "facebook",
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
                      callToAction: cta(strategy),
                      audience: strategy.targetAudience,
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
                      });

          const metadata =
            slot.assetType === "campaign_visual_direction"
              ? {
                  visualAssetRole: "weekly_campaign_visual_direction",
                  appliesToAssetTypes: ["linkedin_post", "facebook_post", "galaxyai_image_prompt"],
                }
              : slot.assetType === "galaxyai_image_prompt"
                ? {
                    visualAssetRole: "social_image_prompt",
                    galaxyAiImagePrompt: true,
                    sourceSocialAssetType,
                    sourceSocialAssetSortOrder: slot.sourceSortOrder ?? null,
                    imagePlatform: sourceSocialAssetType === "linkedin_post" ? "linkedin" : "facebook",
                    imageFormat: "square_1200x1200",
                    requiresHumanReviewBeforeGalaxyAiRun: true,
                    artifactReviewInstruction:
                      "Review the output at least three times for artifacts, distorted people, malformed text, fake metrics, and mismatched objects before accepting the generated image.",
                  }
                : null;

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
