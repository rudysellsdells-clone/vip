export type AuthorityContentInput = {
  contentType: "blog_post" | "white_paper" | "authority_asset";
  title: string;
  topic: string;
  audience?: string;
  businessGoal?: string;
  offerFocus?: string;
  tone?: string;
  cta?: string;
  keywords?: string;
  notes?: string;
};

function read(value: unknown, fallback = "") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function contentTypeLabel(type: AuthorityContentInput["contentType"]) {
  switch (type) {
    case "blog_post":
      return "Blog Post";
    case "white_paper":
      return "White Paper";
    case "authority_asset":
      return "Authority Asset";
    default:
      return "Authority Content";
  }
}

function systemPrompt() {
  return [
    "You are Rudy's VIP, an expert AI marketing strategist and ghostwriter for Web Search Pros.",
    "Write useful, polished, practical authority content.",
    "Use a confident, human, clear voice.",
    "Do not fabricate case studies, client results, testimonials, rankings, traffic, revenue, or guaranteed outcomes.",
    "Make the content useful enough that a business owner would understand the issue and see Web Search Pros as a credible partner.",
    "Return only the finished content. Do not include process notes.",
  ].join("\n");
}

function instructionsForContentType(type: AuthorityContentInput["contentType"]) {
  switch (type) {
    case "blog_post":
      return [
        "Create a complete blog post.",
        "Include an SEO title, meta description, introduction, clear section headings, practical examples, a short FAQ, and a CTA.",
        "Write in a way that is helpful, scannable, and credible.",
      ].join("\n");

    case "white_paper":
      return [
        "Create a white-paper style authority asset.",
        "Include a title, executive summary, market context, problem analysis, strategic framework, implementation roadmap, checklist, and CTA.",
        "Make it substantial enough to be used as a lead magnet or sales enablement PDF later.",
      ].join("\n");

    case "authority_asset":
      return [
        "Create a practical authority asset.",
        "Format it as a strategic guide, checklist, or framework.",
        "Include a clear title, why it matters, core principles, action steps, common mistakes, and CTA.",
        "Make it useful for sales conversations and repurposing into social posts.",
      ].join("\n");

    default:
      return "Create a polished authority content asset.";
  }
}

export function buildAuthorityContentPrompt(input: AuthorityContentInput) {
  const type = contentTypeLabel(input.contentType);
  const title = read(input.title, `${type}: ${read(input.topic, "Untitled Topic")}`);
  const topic = read(input.topic, title);
  const audience = read(input.audience, "business owners and marketing decision-makers");
  const businessGoal = read(input.businessGoal, "increase visibility, trust, and qualified conversations");
  const offerFocus = read(input.offerFocus, "SEO, AIO, content, link building, social media, and marketing automation");
  const tone = read(input.tone, "strategic, clear, confident, and helpful");
  const cta = read(input.cta, "schedule a strategy call");
  const keywords = read(input.keywords, "AI search visibility, SEO, content strategy, marketing automation");
  const notes = read(input.notes, "No extra notes provided.");

  return [
    systemPrompt(),
    "",
    "Content type:",
    type,
    "",
    "Content instructions:",
    instructionsForContentType(input.contentType),
    "",
    "Content brief:",
    `Title: ${title}`,
    `Topic: ${topic}`,
    `Audience: ${audience}`,
    `Business goal: ${businessGoal}`,
    `Offer focus: ${offerFocus}`,
    `Tone: ${tone}`,
    `CTA: ${cta}`,
    `Keywords / topical phrases: ${keywords}`,
    `Additional notes: ${notes}`,
    "",
    "Important guardrails:",
    "- Do not invent fake proof.",
    "- Do not promise guaranteed rankings, leads, traffic, or revenue.",
    "- Keep claims realistic and framed as strategy, opportunity, or potential.",
    "- Make the content genuinely useful and easy to repurpose.",
  ].join("\n");
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

export async function generateAuthorityContent(input: AuthorityContentInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const prompt = buildAuthorityContentPrompt(input);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: input.contentType === "white_paper" ? 5000 : 3500,
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
    throw new Error("OpenAI returned an empty authority content response.");
  }

  return {
    content,
    prompt,
    model,
  };
}
