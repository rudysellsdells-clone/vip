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
  const baseTheme = campaignTheme?.trim() || strategy.monthlyObjective || "Authority Growth";
  const topic = topicForWeek(strategy, weekNumber);

  return `${monthLabel(month)} Week ${weekNumber}: ${baseTheme} — ${topic}`;
}

function defaultCampaignAngle({
  weekNumber,
  businessContext,
  strategy,
}: {
  weekNumber: number;
  businessContext?: string;
  strategy: MonthlyCampaignStrategyInput;
}) {
  const topic = topicForWeek(strategy, weekNumber);
  const audience = strategy.targetAudience || "business owners";
  const offer = strategy.primaryOffer || "a stronger visibility strategy";
  const objective = strategy.monthlyObjective || "build visibility, trust, and authority";
  const differentiator = strategy.differentiator || "a practical, campaign-based approach";
  const proof = strategy.proofPoints ? ` Proof points to weave in: ${strategy.proofPoints}` : "";
  const context = businessContext?.trim() ? ` Context: ${businessContext.trim()}` : "";

  const weeklyAngles = [
    `Educate ${audience} on why ${topic} matters and how it supports the monthly objective: ${objective}.`,
    `Show ${audience} practical steps for improving ${topic} while positioning ${offer}.`,
    `Explain the common mistakes around ${topic} and how ${differentiator} helps avoid wasted effort.`,
    `Turn ${topic} into an action plan that moves ${audience} toward ${offer}.`,
    `Recap the month, reinforce ${topic}, and make the case for taking the next step toward ${offer}.`,
  ];

  return `${weeklyAngles[(weekNumber - 1) % weeklyAngles.length]}${proof}${context}`;
}

function strategyBullets(strategy: MonthlyCampaignStrategyInput) {
  const bullets = [
    strategy.monthlyObjective ? `Monthly objective: ${strategy.monthlyObjective}` : "",
    strategy.targetAudience ? `Audience: ${strategy.targetAudience}` : "",
    strategy.primaryOffer ? `Offer: ${strategy.primaryOffer}` : "",
    strategy.differentiator ? `Differentiator: ${strategy.differentiator}` : "",
    strategy.proofPoints ? `Proof: ${strategy.proofPoints}` : "",
  ].filter(Boolean);

  return bullets.length ? bullets : ["Campaign objective: Build visibility, trust, and authority."];
}

function cta(strategy: MonthlyCampaignStrategyInput) {
  return strategy.callToAction || "Start with a visibility review and identify your highest-value opportunities.";
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

function socialEnding({
  assetType,
  strategy,
  topic,
}: {
  assetType: string;
  strategy: MonthlyCampaignStrategyInput;
  topic: string;
}) {
  const emojis = socialEmojiSet({ topic, assetType });
  const hashtags = socialHashtags({ strategy, topic, assetType });

  return [emojis, hashtags].filter(Boolean).join("\n");
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
  const bullets = strategyBullets(strategy);
  const callToAction = cta(strategy);
  const topic = topicForWeek(strategy, weekNumber);

  switch (assetType) {
    case "blog_post":
      return [
        `# ${campaignName}`,
        "",
        "## Why This Matters",
        campaignAngle,
        "",
        "## Strategy Focus",
        ...bullets.map((bullet) => `- ${bullet}`),
        "",
        "## What Business Owners Should Know",
        "- Visibility now depends on more than a single channel.",
        "- Authority, helpful content, and consistent publishing compound over time.",
        "- Strong campaigns work best when blog, social, email, and video reinforce the same idea.",
        "",
        "## How to Take Action",
        callToAction,
      ].join("\n");

    case "linkedin_post":
      return [
        `${socialEmojiSet({ topic, assetType })} ${campaignName}`,
        "",
        campaignAngle,
        "",
        `Strategy focus: ${bullets[0]}`,
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
        "This week, the focus is simple:",
        ...bullets.map((bullet) => `- ${bullet}`),
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
        `Hook: Most businesses do not need more random content. They need a clearer strategy around ${topic}.`,
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

    const campaignAngle = defaultCampaignAngle({
      weekNumber: week.weekNumber,
      businessContext: input.businessContext,
      strategy,
    });

    return {
      weekNumber: week.weekNumber,
      campaignName,
      campaignAngle,
      strategy,
      weekStartDate: dateKey(week.start),
      weekEndDate: dateKey(week.end),
      assets: WEEKLY_CAMPAIGN_ASSET_BLUEPRINT.map((slot) => {
        const publishDate = addDays(week.start, slot.dayOffset);
        const scheduledAt = setLocalTime(publishDate, slot.hour, slot.minute);
        const label = slot.label;

        return {
          assetType: slot.assetType,
          title: `${campaignName} — ${assetTypeLabel(slot.assetType)}`,
          content: contentForAsset({
            assetType: slot.assetType,
            campaignName,
            campaignAngle,
            label,
            strategy,
            weekNumber: week.weekNumber,
          }),
          plannedPublishDate: dateKey(publishDate),
          scheduledPublishAt: scheduledAt.toISOString(),
          sortOrder: slot.sortOrder,
          calendarNotes: `${label}. Generated as part of weekly campaign package.`,
        };
      }),
    };
  });
}
