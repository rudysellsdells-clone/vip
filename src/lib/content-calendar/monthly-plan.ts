export type MonthlyContentPlanInput = {
  planMonth: string;
  monthlyTheme: string;
  businessGoal?: string;
  targetAudience?: string;
  offerFocus?: string;
  primaryCta?: string;
};

export type WeeklyCampaignPlan = {
  weekNumber: number;
  campaignTitle: string;
  campaignTheme: string;
  blogTitle: string;
  whatIfStoryAngle: string;
  videoConcept: string;
  socialAngles: string[];
  outreachAngle: string;
  cta: string;
};

function read(value: string | undefined | null, fallback: string) {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function startOfMonth(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function monthLabel(planMonth: string) {
  const date = startOfMonth(planMonth);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function buildWeeklyCampaigns(input: MonthlyContentPlanInput) {
  const theme = read(input.monthlyTheme, "AI-powered marketing growth");
  const goal = read(input.businessGoal, "generate more qualified conversations");
  const audience = read(input.targetAudience, "business owners");
  const offer = read(input.offerFocus, "SEO, AIO, content, and marketing automation");
  const cta = read(input.primaryCta, "Schedule a strategy call");

  const weeklyCampaigns: WeeklyCampaignPlan[] = [
    {
      weekNumber: 1,
      campaignTitle: `Why ${audience} need a smarter visibility system`,
      campaignTheme: `Frame the monthly theme: ${theme}. Focus on why the market is changing and why visibility now requires more than occasional posting.`,
      blogTitle: `Why ${audience} Need a Smarter Visibility System`,
      whatIfStoryAngle: `What if a ${audience} business became easier to find across search, AI answers, and social channels?`,
      videoConcept: `A cinematic hook showing a business going from invisible online to visible across search, AI, content, and social touchpoints.`,
      socialAngles: [
        "The old way of waiting to be found is not enough.",
        "Visibility now happens across search, AI tools, directories, and social proof.",
        "The businesses that win are the ones that make themselves easy to trust before the first call.",
      ],
      outreachAngle: `Introduce the idea that ${offer} can become a single growth system, not separate random tactics.`,
      cta,
    },
    {
      weekNumber: 2,
      campaignTitle: `The hidden cost of weak search and AI presence`,
      campaignTheme: `Show the cost of not being visible when prospects are researching solutions. Tie the problem directly to ${goal}.`,
      blogTitle: `The Hidden Cost of Weak Search and AI Presence`,
      whatIfStoryAngle: `What if a prospect searching for help found the business everywhere they looked instead of finding competitors first?`,
      videoConcept: `A problem-focused video showing missed opportunities, competitor visibility, and the gap between interest and inbound leads.`,
      socialAngles: [
        "If prospects cannot find you, they cannot choose you.",
        "AI search is becoming part of the buying journey.",
        "Weak visibility quietly sends demand to better-positioned competitors.",
      ],
      outreachAngle: `Use a consultative note that highlights missed opportunity without sounding alarmist.`,
      cta,
    },
    {
      weekNumber: 3,
      campaignTitle: `Building authority with content, links, and proof`,
      campaignTheme: `Explain how authority is built through useful content, directory credibility, social consistency, and proof-of-work.`,
      blogTitle: `How to Build Digital Authority Before Prospects Ever Contact You`,
      whatIfStoryAngle: `What if the business had a monthly system that built trust with content, directories, social proof, and helpful resources?`,
      videoConcept: `A transformation video showing content, backlinks, profiles, and social posts forming a connected trust engine.`,
      socialAngles: [
        "Authority is built before the sales conversation starts.",
        "Content answers questions. Links build credibility. Follow-up converts attention.",
        "A real marketing system compounds over time.",
      ],
      outreachAngle: `Position Web Search Pros as the partner that can build the authority layer consistently.`,
      cta,
    },
    {
      weekNumber: 4,
      campaignTitle: `Turning visibility into leads with automation`,
      campaignTheme: `Close the month by connecting visibility to lead capture, follow-up, sales enablement, and measurable action.`,
      blogTitle: `How to Turn Visibility Into a Repeatable Lead Engine`,
      whatIfStoryAngle: `What if the business did not just get more visible, but had a follow-up system that turned attention into conversations?`,
      videoConcept: `A polished CTA video showing traffic, content, forms, email follow-up, and booked calls working as a single engine.`,
      socialAngles: [
        "Visibility is only the first step. Follow-up turns attention into revenue.",
        "The best marketing systems connect content, traffic, automation, and sales activity.",
        "The goal is not more noise. The goal is more qualified conversations.",
      ],
      outreachAngle: `Invite the prospect to review what a connected visibility-to-lead system could look like for their business.`,
      cta,
    },
  ];

  return weeklyCampaigns;
}

export function buildCalendarItems(input: MonthlyContentPlanInput, planId: string, userId: string) {
  const monthStart = startOfMonth(input.planMonth);
  const weeklyCampaigns = buildWeeklyCampaigns(input);
  const items: Array<Record<string, unknown>> = [];

  for (const week of weeklyCampaigns) {
    const weekStart = addDays(monthStart, (week.weekNumber - 1) * 7);

    items.push({
      user_id: userId,
      plan_id: planId,
      scheduled_date: toDateString(weekStart),
      week_number: week.weekNumber,
      title: week.campaignTitle,
      description: week.campaignTheme,
      item_type: "weekly_campaign",
      platform: "campaign",
      status: "planned",
      content_angle: week.campaignTheme,
      cta: week.cta,
      metadata: week,
    });

    items.push({
      user_id: userId,
      plan_id: planId,
      scheduled_date: toDateString(addDays(weekStart, 1)),
      week_number: week.weekNumber,
      title: week.blogTitle,
      description: `Long-form authority content for week ${week.weekNumber}.`,
      item_type: "blog_post",
      platform: "website",
      status: "planned",
      content_angle: week.campaignTheme,
      cta: week.cta,
      metadata: { sourceCampaign: week.campaignTitle },
    });

    items.push({
      user_id: userId,
      plan_id: planId,
      scheduled_date: toDateString(addDays(weekStart, 2)),
      week_number: week.weekNumber,
      title: `LinkedIn: ${week.socialAngles[0]}`,
      description: week.socialAngles[0],
      item_type: "linkedin_post",
      platform: "linkedin",
      status: "planned",
      content_angle: week.socialAngles[0],
      cta: week.cta,
      metadata: { sourceCampaign: week.campaignTitle },
    });

    items.push({
      user_id: userId,
      plan_id: planId,
      scheduled_date: toDateString(addDays(weekStart, 3)),
      week_number: week.weekNumber,
      title: `Facebook: ${week.socialAngles[1]}`,
      description: week.socialAngles[1],
      item_type: "facebook_post",
      platform: "facebook",
      status: "planned",
      content_angle: week.socialAngles[1],
      cta: week.cta,
      metadata: { sourceCampaign: week.campaignTitle },
    });

    items.push({
      user_id: userId,
      plan_id: planId,
      scheduled_date: toDateString(addDays(weekStart, 4)),
      week_number: week.weekNumber,
      title: `Video concept: ${week.campaignTitle}`,
      description: week.videoConcept,
      item_type: "video_concept",
      platform: "youtube/social",
      status: "planned",
      content_angle: week.videoConcept,
      cta: week.cta,
      metadata: { sourceCampaign: week.campaignTitle },
    });

    items.push({
      user_id: userId,
      plan_id: planId,
      scheduled_date: toDateString(addDays(weekStart, 5)),
      week_number: week.weekNumber,
      title: `What-If Story: Week ${week.weekNumber}`,
      description: week.whatIfStoryAngle,
      item_type: "what_if_story",
      platform: "prospecting",
      status: "planned",
      content_angle: week.whatIfStoryAngle,
      cta: week.cta,
      metadata: { sourceCampaign: week.campaignTitle },
    });

    items.push({
      user_id: userId,
      plan_id: planId,
      scheduled_date: toDateString(addDays(weekStart, 6)),
      week_number: week.weekNumber,
      title: `Outreach angle: ${week.campaignTitle}`,
      description: week.outreachAngle,
      item_type: "email_outreach",
      platform: "gmail",
      status: "planned",
      content_angle: week.outreachAngle,
      cta: week.cta,
      metadata: { sourceCampaign: week.campaignTitle },
    });
  }

  return items;
}
