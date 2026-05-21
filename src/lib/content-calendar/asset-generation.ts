type CalendarItem = {
  id: string;
  title: string;
  description?: string | null;
  item_type: string;
  platform?: string | null;
  content_angle?: string | null;
  cta?: string | null;
  week_number?: number | null;
  scheduled_date?: string | null;
  metadata?: Record<string, unknown> | null;
};

type CalendarPlan = {
  id: string;
  month_label?: string | null;
  monthly_theme?: string | null;
  business_goal?: string | null;
  target_audience?: string | null;
  offer_focus?: string | null;
};

function read(value: unknown, fallback = "") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

export function mapCalendarItemToAssetType(itemType: string) {
  const map: Record<string, string> = {
    blog_post: "blog_post",
    facebook_post: "facebook_post",
    linkedin_post: "linkedin_post",
    email_outreach: "email",
    video_concept: "video_script",
    what_if_story: "prospect_what_if_story",
    white_paper: "white_paper",
    authority_asset: "authority_asset",
    other: "content_asset",
  };

  return map[itemType] ?? "content_asset";
}

export function isCampaignCalendarItem(itemType: string) {
  return itemType === "weekly_campaign";
}

export function buildCampaignPayloadFromCalendarItem({
  item,
  plan,
  userId,
}: {
  item: CalendarItem;
  plan: CalendarPlan;
  userId: string;
}) {
  const metadata = item.metadata ?? {};

  return {
    user_id: userId,
    name: item.title,
    idea:
      read(item.description) ||
      read(item.content_angle) ||
      `Weekly campaign for ${read(plan.monthly_theme, "the monthly content plan")}.`,
    buyer_segment: read(plan.target_audience, "business owners"),
    audience: read(plan.target_audience, "business owners"),
    goal: read(plan.business_goal, "generate more qualified conversations"),
    cta: read(item.cta, "Schedule a strategy call"),
    status: "draft",
    notes: [
      `Created from Strategic Content Calendar item ${item.id}.`,
      `Plan: ${read(plan.month_label, "Monthly plan")}.`,
      `Theme: ${read(plan.monthly_theme, "Not provided")}.`,
      `Week: ${read(item.week_number, "unknown")}.`,
      metadata?.sourceCampaign ? `Source campaign: ${metadata.sourceCampaign}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function systemPrompt() {
  return [
    "You are Rudy's VIP, an expert AI marketing strategist and ghostwriter for Web Search Pros.",
    "Write polished, practical, conversion-focused marketing content.",
    "Use a confident, human, clear style.",
    "Do not invent fake case studies, fake results, fake testimonials, or guaranteed outcomes.",
    "If content is hypothetical, clearly label it as a scenario, not a completed case study.",
    "Return only the finished content. Do not include process notes.",
  ].join("\n");
}

function itemSpecificInstructions(item: CalendarItem) {
  switch (item.item_type) {
    case "blog_post":
      return [
        "Create a complete blog post.",
        "Include an SEO title, meta description, introduction, clear sections, practical advice, a short FAQ, and a CTA.",
        "Write enough detail to be useful, but keep it readable and not bloated.",
      ].join("\n");

    case "facebook_post":
      return [
        "Create a Facebook Page post.",
        "Make it approachable, clear, and helpful.",
        "Include a strong opening, short paragraphs, and a soft CTA.",
        "Do not overuse hashtags. Use at most 3 if helpful.",
      ].join("\n");

    case "linkedin_post":
      return [
        "Create a LinkedIn company page post.",
        "Make it professional, authority-building, and readable.",
        "Use a strong hook, short paragraphs, and a clear point of view.",
        "End with a thoughtful CTA.",
      ].join("\n");

    case "email_outreach":
      return [
        "Create a prospecting email draft.",
        "Keep it consultative, useful, and not spammy.",
        "Include a subject line, preview line, email body, and soft CTA.",
        "Do not claim we audited their site unless specific audit data is provided.",
      ].join("\n");

    case "video_concept":
      return [
        "Create a campaign video concept and production prompt.",
        "Include a 20-second structure with Hook, Problem, Solution, and CTA.",
        "Include a GalaxyAI-style prompt for social media motion/video output.",
        "Include a YouTube title and description draft.",
      ].join("\n");

    case "what_if_story":
      return [
        "Create a What-If Success Story.",
        "Clearly label it as a strategic what-if scenario, not a completed case study or promised result.",
        "Structure it with: opening, current situation, missed opportunity, what-if transformation, 30/60/90-day path, recommended Web Search Pros strategy, and CTA.",
        "Avoid fake metrics and fake client claims.",
      ].join("\n");

    case "white_paper":
    case "authority_asset":
      return [
        "Create a white-paper style authority asset.",
        "Include title, executive summary, problem, market context, framework, implementation checklist, and CTA.",
        "Make it useful as a lead magnet or sales enablement asset.",
      ].join("\n");

    default:
      return [
        "Create a polished marketing asset based on the calendar item.",
        "Use the planned angle and CTA.",
      ].join("\n");
  }
}

export function buildCalendarAssetPrompt({
  item,
  plan,
  linkedCampaignName,
}: {
  item: CalendarItem;
  plan: CalendarPlan;
  linkedCampaignName?: string | null;
}) {
  return [
    systemPrompt(),
    "",
    "Content request:",
    itemSpecificInstructions(item),
    "",
    "Monthly plan context:",
    `Month: ${read(plan.month_label, "Not provided")}`,
    `Theme: ${read(plan.monthly_theme, "Not provided")}`,
    `Business goal: ${read(plan.business_goal, "Generate qualified conversations")}`,
    `Target audience: ${read(plan.target_audience, "Business owners")}`,
    `Offer focus: ${read(plan.offer_focus, "SEO, AIO, content, and automation")}`,
    "",
    "Calendar item:",
    `Title: ${read(item.title, "Untitled")}`,
    `Type: ${read(item.item_type, "content_asset")}`,
    `Platform: ${read(item.platform, "Not specified")}`,
    `Scheduled date: ${read(item.scheduled_date, "Not specified")}`,
    `Week: ${read(item.week_number, "Not specified")}`,
    `Description: ${read(item.description, "Not provided")}`,
    `Content angle: ${read(item.content_angle, "Not provided")}`,
    `CTA: ${read(item.cta, "Schedule a strategy call")}`,
    linkedCampaignName ? `Linked campaign: ${linkedCampaignName}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function extractTextFromResponsesApi(payload: Record<string, any>) {
  if (typeof payload.output_text === "string") {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const parts: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const contentItem of content) {
      if (typeof contentItem?.text === "string") {
        parts.push(contentItem.text);
      } else if (typeof contentItem?.text?.value === "string") {
        parts.push(contentItem.text.value);
      }
    }
  }

  return parts.join("\n").trim();
}

export async function generateCalendarAssetContent(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 3000,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed: ${response.status} ${response.statusText} — ${text.slice(0, 800)}`
    );
  }

  let payload: Record<string, any>;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Unable to parse OpenAI response: ${text.slice(0, 500)}`);
  }

  const content = extractTextFromResponsesApi(payload);

  if (!content) {
    throw new Error("OpenAI returned an empty content response.");
  }

  return content;
}
