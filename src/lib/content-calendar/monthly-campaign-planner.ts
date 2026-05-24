import {
  WEEKLY_CAMPAIGN_ASSET_BLUEPRINT,
  WeeklyAssetBlueprint,
  assetTypeLabel,
} from "@/lib/content-calendar/monthly-campaign-blueprint";

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

function topicForWeek(strategy: MonthlyCampaignStrategyInput, weekNumber: number) {
  const topics = topicList(strategy);

  if (topics.length) {
    return topics[(weekNumber - 1) % topics.length];
  }

  const defaults = [
    "AI search visibility",
    "local authority building",
    "content consistency",
    "lead generation trust signals",
    "monthly recap and promotion",
  ];

  return defaults[(weekNumber - 1) % defaults.length];
}

function defaultCampaignName({
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
  const audience = strategy.targetAudience || "local business owners";
  const offer = strategy.primaryOffer || "stronger online visibility";
  const differentiator = strategy.differentiator || "a practical visibility strategy";

  const angles = [
    `${audience} are paying closer attention to ${topic}, and the businesses that explain it clearly are more likely to earn trust before the first conversation.`,
    `Improving ${topic} does not have to be complicated. The right plan connects helpful content, search visibility, and a clear next step for the customer.`,
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
  campaignAngle,
  businessContext,
  strategy,
}: {
  month: string;
  weekNumber: number;
  campaignName: string;
  campaignAngle: string;
  businessContext?: string;
  strategy: MonthlyCampaignStrategyInput;
}) {
  return [
    "PRIVATE GENERATION BRIEF — DO NOT PRINT THIS BRIEF IN THE FINAL CONTENT.",
    "",
    `Month: ${month}`,
    `Campaign: ${campaignName}`,
    `Week: ${weekNumber}`,
    "",
    "Use the following strategy inputs to guide the angle, examples, offer positioning, and CTA.",
    "Do not publish these labels or raw notes in the content.",
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
  return strategy.callToAction || "Start with a visibility review and find the best opportunities to improve.";
}

function publicOfferPhrase(strategy: MonthlyCampaignStrategyInput) {
  return strategy.primaryOffer || "a stronger visibility plan";
}

function hashtagFromPhrase(value: string) {
  const words = value
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
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
  if (lower.includes("lead") || lower.includes("sales")) return "📈";
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
    "#WebSearchPros",
    "#DigitalMarketing",
    "#LocalSEO",
  ];

  const channelTag = assetType === "linkedin_post" ? "#BusinessGrowth" : "#LocalBusiness";

  return uniqueValues([...topicTags, ...defaults, channelTag])
    .slice(0, assetType === "linkedin_post" ? 6 : 5)
    .join(" ");
}

function contentForAsset({
  assetType,
  campaignName,
  campaignAngle,
  label,
  strategy,
  weekNumber,
}: {
  assetType: string;
  campaignName: string;
  campaignAngle: string;
  label: string;
  strategy: MonthlyCampaignStrategyInput;
  weekNumber: number;
}) {
  const callToAction = cta(strategy);
  const topic = topicForWeek(strategy, weekNumber);
  const offer = publicOfferPhrase(strategy);

  switch (assetType) {
    case "blog_post":
      return [
        `# ${campaignName}`,
        "",
        "## Why This Matters",
        campaignAngle,
        "",
        "## What Business Owners Should Know",
        `A clear plan around ${topic} helps people understand why your business is relevant before they ever reach out.`,
        "",
        "The strongest content does not try to say everything at once. It focuses on one useful idea, explains it clearly, and connects that idea to the next step.",
        "",
        "## How to Put This Into Action",
        `Start by turning this week’s topic into a practical message across your website, social posts, email, and video content. Keep the message useful, direct, and tied to ${offer}.`,
        "",
        "## Next Step",
        callToAction,
      ].join("\n");

    case "linkedin_post":
      return [
        `${socialEmojiSet({ topic, assetType })} ${campaignName}`,
        "",
        campaignAngle,
        "",
        `A good campaign does more than fill the calendar. It gives your audience a clear reason to trust you, remember you, and take the next step.`,
        "",
        callToAction,
        "",
        socialHashtags({ strategy, topic, assetType }),
      ].join("\n");

    case "facebook_post":
      return [
        `${socialEmojiSet({ topic, assetType })} ${campaignName}`,
        "",
        "Quick thought for local businesses:",
        "",
        campaignAngle,
        "",
        `When your content is built around one clear weekly idea, it becomes easier for people to understand what you do and why it matters.`,
        "",
        callToAction,
        "",
        socialHashtags({ strategy, topic, assetType }),
      ].join("\n");

    case "email":
      return [
        `Subject: ${campaignName}`,
        "",
        "Hi there,",
        "",
        campaignAngle,
        "",
        `This week is a good time to look at how ${topic} supports your visibility and how it connects to the next step you want people to take.`,
        "",
        callToAction,
        "",
        "Best,",
        "Web Search Pros",
      ].join("\n");

    case "video_script":
      return [
        `${campaignName}`,
        "",
        "20-second video script:",
        "",
        `Hook: Most businesses do not need more random content. They need a clearer message around ${topic}.`,
        "",
        `Main point: ${campaignAngle}`,
        "",
        `Close: ${callToAction}`,
      ].join("\n");

    default:
      return `${label}: ${campaignAngle}`;
  }
}

export function buildMonthlyCampaignPlan(input: MonthlyCampaignPlanInput): WeeklyCampaignPlan[] {
  const weeks = campaignWeeksForMonth(input.month);
  const strategy = cleanStrategy(input.strategy);

  return weeks.map((week) => {
    const campaignName = defaultCampaignName({
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
      campaignAngle,
      businessContext: input.businessContext,
      strategy,
    });

    return {
      weekNumber: week.weekNumber,
      campaignName,
      campaignAngle,
      generationPrompt,
      strategy,
      weekStartDate: dateKey(week.start),
      weekEndDate: dateKey(week.end),
      assets: WEEKLY_CAMPAIGN_ASSET_BLUEPRINT.map((slot) => {
        const publishDate = addDays(week.start, slot.dayOffset);
        const scheduledAt = setLocalTime(publishDate, slot.hour, slot.minute);
        const label = slot.label;
        const content = contentForAsset({
          assetType: slot.assetType,
          campaignName,
          campaignAngle,
          label,
          strategy,
          weekNumber: week.weekNumber,
        });

        return {
          assetType: slot.assetType,
          title: `${campaignName} — ${assetTypeLabel(slot.assetType)}`,
          content,
          generationPrompt: [
            generationPrompt,
            "",
            `Asset Type: ${slot.assetType}`,
            `Asset Slot: ${label}`,
            "Generate public-facing content only. Do not include the private brief, raw strategy labels, or internal planning notes.",
          ].join("\n"),
          plannedPublishDate: dateKey(publishDate),
          scheduledPublishAt: scheduledAt.toISOString(),
          sortOrder: slot.sortOrder,
          calendarNotes: `${label}. Generated as part of weekly campaign package.`,
        };
      }),
    };
  });
}
