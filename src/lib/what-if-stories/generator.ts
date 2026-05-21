export type WhatIfStoryInput = {
  prospectName?: string;
  businessName: string;
  websiteUrl?: string;
  industry?: string;
  location?: string;
  currentSituation?: string;
  painPoint?: string;
  opportunity?: string;
  offerFocus?: string;
  tone?: string;
  cta?: string;
};

function read(value: unknown, fallback = "") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function systemPrompt() {
  return [
    "You are Rudy's VIP, an expert AI marketing strategist and ghostwriter for Web Search Pros.",
    "Write a personalized prospect-facing What-If Success Story.",
    "The story must be persuasive, honest, specific, and clearly hypothetical.",
    "Do not fabricate real results, fake client names, fake testimonials, fake rankings, fake revenue, or guaranteed outcomes.",
    "Make it feel like a strategic preview that helps the prospect imagine what could be possible.",
    "Use clear, human, consultative language.",
    "Return only the finished asset. Do not include process notes.",
  ].join("\n");
}

export function buildWhatIfStoryPrompt(input: WhatIfStoryInput) {
  const businessName = read(input.businessName, "the prospect's business");
  const prospectName = read(input.prospectName, "the business owner");
  const industry = read(input.industry, "their industry");
  const location = read(input.location, "their local market");
  const websiteUrl = read(input.websiteUrl, "not provided");
  const currentSituation = read(
    input.currentSituation,
    "The business appears to have an opportunity to strengthen online visibility, authority, content, and follow-up."
  );
  const painPoint = read(
    input.painPoint,
    "Potential customers may not be finding and choosing the business as often as they should."
  );
  const opportunity = read(
    input.opportunity,
    "Create a connected visibility, content, AI search, and automation system that turns attention into more qualified conversations."
  );
  const offerFocus = read(
    input.offerFocus,
    "SEO, AIO, content creation, link building, social media, and marketing automation"
  );
  const tone = read(input.tone, "consultative, confident, and helpful");
  const cta = read(input.cta, "schedule a strategy call");

  return [
    systemPrompt(),
    "",
    "Required label/disclaimer:",
    "Include this idea clearly near the beginning: This is a strategic what-if scenario, not a completed case study or promised result.",
    "",
    "Prospect context:",
    `Prospect/contact name: ${prospectName}`,
    `Business name: ${businessName}`,
    `Website: ${websiteUrl}`,
    `Industry: ${industry}`,
    `Location/market: ${location}`,
    `Current situation: ${currentSituation}`,
    `Pain point: ${painPoint}`,
    `Opportunity: ${opportunity}`,
    `Web Search Pros offer focus: ${offerFocus}`,
    `Tone: ${tone}`,
    `Primary CTA: ${cta}`,
    "",
    "Create the asset using this structure:",
    "",
    "1. Title",
    `Use a title like: What If ${businessName} Had a Smarter Growth Engine?`,
    "",
    "2. Personal opening",
    "Briefly explain why this was created for the prospect and reinforce that it is a strategic scenario.",
    "",
    "3. Current situation",
    "Describe the likely business context carefully without pretending to know private facts.",
    "",
    "4. Missed opportunity",
    "Explain what can happen when visibility, content, trust, and follow-up are disconnected.",
    "",
    "5. The what-if scenario",
    "Paint a realistic picture of what could change if the business had a connected marketing system.",
    "",
    "6. 30/60/90-day path",
    "Break the possible path into 30 days, 60 days, and 90 days.",
    "",
    "7. Recommended Web Search Pros strategy",
    "Connect the recommendation to the offer focus.",
    "",
    "8. Why this matters",
    "Summarize the business value in plain English.",
    "",
    "9. Soft CTA",
    `End with a direct but low-pressure CTA to ${cta}.`,
    "",
    "Important guardrails:",
    "- Do not say this already happened.",
    "- Do not use fake metrics.",
    "- Do not promise rankings, traffic, revenue, or leads.",
    "- Use phrases like could, possible, potential, scenario, path, and strategic preview.",
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

export async function generateWhatIfStory(input: WhatIfStoryInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const prompt = buildWhatIfStoryPrompt(input);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 3500,
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
    throw new Error("OpenAI returned an empty What-If Story response.");
  }

  return {
    content,
    prompt,
    model,
  };
}
