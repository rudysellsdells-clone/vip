import {
  WEEKLY_CAMPAIGN_ASSET_BLUEPRINT,
  WeeklyAssetBlueprint,
  assetTypeLabel,
} from "@/lib/content-calendar/monthly-campaign-blueprint";

export type MonthlyCampaignPlanInput = {
  month: string;
  businessContext?: string;
  campaignTheme?: string;
};

export type WeeklyCampaignPlan = {
  weekNumber: number;
  campaignName: string;
  campaignAngle: string;
  weekStartDate: string;
  weekEndDate: string;
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

function defaultCampaignName({
  month,
  weekNumber,
  campaignTheme,
}: {
  month: string;
  weekNumber: number;
  campaignTheme?: string;
}) {
  const baseTheme = campaignTheme?.trim() || "Authority Growth";
  return `${monthLabel(month)} Week ${weekNumber}: ${baseTheme}`;
}

function defaultCampaignAngle({
  weekNumber,
  businessContext,
}: {
  weekNumber: number;
  businessContext?: string;
}) {
  const angles = [
    "Educate the audience on the core problem and why it matters now.",
    "Show practical ways to improve visibility, trust, and authority.",
    "Explain common mistakes and how to avoid wasted marketing effort.",
    "Turn strategy into a clear action plan for business owners.",
    "Use a recap, proof, or promotion angle to reinforce the month.",
  ];

  const context = businessContext?.trim();

  return context
    ? `${angles[(weekNumber - 1) % angles.length]} Context: ${context}`
    : angles[(weekNumber - 1) % angles.length];
}

function contentForAsset({
  assetType,
  campaignName,
  campaignAngle,
  label,
}: {
  assetType: string;
  campaignName: string;
  campaignAngle: string;
  label: string;
}) {
  switch (assetType) {
    case "blog_post":
      return [
        `# ${campaignName}`,
        "",
        "## Why This Matters",
        campaignAngle,
        "",
        "## What Business Owners Should Know",
        "- Visibility now depends on more than a single channel.",
        "- Authority, helpful content, and consistent publishing compound over time.",
        "- Strong campaigns work best when blog, social, email, and video reinforce the same idea.",
        "",
        "## How to Take Action",
        "Use this campaign as the weekly anchor. The supporting social, email, and video assets should point back to the same core message.",
      ].join("\n");

    case "linkedin_post":
      return [
        `${campaignName}`,
        "",
        `${campaignAngle}`,
        "",
        "Business owners do not need more random content. They need a clear weekly message that builds authority across the places customers already pay attention.",
        "",
        "What would improve if your content, search visibility, and AI presence were all working from the same campaign?",
      ].join("\n");

    case "facebook_post":
      return [
        `${campaignName}`,
        "",
        "Quick thought for local businesses:",
        "",
        `${campaignAngle}`,
        "",
        "Consistent weekly campaigns make it easier to stay visible without feeling like you are starting from scratch every day.",
      ].join("\n");

    case "email":
      return [
        `Subject: ${campaignName}`,
        "",
        "Hi there,",
        "",
        `${campaignAngle}`,
        "",
        "This week, the focus is simple: turn one clear business idea into useful content across your website, social channels, and outreach.",
        "",
        "If you want stronger visibility, the first step is making sure your message is consistent where people search, compare, and decide.",
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
        "Hook: Most businesses do not have a content problem. They have a consistency problem.",
        "",
        `Main point: ${campaignAngle}`,
        "",
        "Close: Start with one weekly campaign, then turn it into blog, social, email, and video content that all works together.",
      ].join("\n");

    default:
      return `${label}: ${campaignAngle}`;
  }
}

export function buildMonthlyCampaignPlan(input: MonthlyCampaignPlanInput): WeeklyCampaignPlan[] {
  const weeks = campaignWeeksForMonth(input.month);

  return weeks.map((week) => {
    const campaignName = defaultCampaignName({
      month: input.month,
      weekNumber: week.weekNumber,
      campaignTheme: input.campaignTheme,
    });

    const campaignAngle = defaultCampaignAngle({
      weekNumber: week.weekNumber,
      businessContext: input.businessContext,
    });

    return {
      weekNumber: week.weekNumber,
      campaignName,
      campaignAngle,
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
