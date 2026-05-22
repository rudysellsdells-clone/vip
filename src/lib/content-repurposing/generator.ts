export type SourceAsset = {
  id: string;
  title: string;
  asset_type: string;
  content: string;
  campaign_id?: string | null;
};

export type RepurposedAssetDraft = {
  assetType: string;
  title: string;
  content: string;
};

function read(value: unknown, fallback = "") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function systemPrompt() {
  return [
    "You are Rudy's VIP, an expert AI marketing strategist and ghostwriter for Web Search Pros.",
    "Repurpose authority content into channel-specific marketing assets.",
    "Keep the content human, useful, practical, and conversion-focused.",
    "Do not invent fake results, fake testimonials, fake statistics, fake rankings, fake clients, or guaranteed outcomes.",
    "Return valid JSON only. Do not include markdown fences or explanatory text.",
  ].join("\n");
}

export function buildRepurposingPrompt(source: SourceAsset) {
  return [
    systemPrompt(),
    "",
    "Source asset:",
    `Title: ${read(source.title, "Untitled authority asset")}`,
    `Type: ${read(source.asset_type, "authority_content")}`,
    "",
    "Source content:",
    read(source.content, ""),
    "",
    "Create a repurposing pack with these exact JSON keys:",
    "",
    "{",
    '  "linkedin_post": { "title": "...", "content": "..." },',
    '  "facebook_post": { "title": "...", "content": "..." },',
    '  "email_teaser": { "title": "...", "content": "..." },',
    '  "video_prompt": { "title": "...", "content": "..." }',
    "}",
    "",
    "Requirements:",
    "- LinkedIn post: professional, authority-building, strong hook, short paragraphs, clear CTA.",
    "- Facebook post: approachable, helpful, plain English, soft CTA.",
    "- Email teaser: subject line, preview line, body, CTA. Keep it concise and useful.",
    "- Video prompt: short motion/video concept with hook, problem, solution, CTA, and GalaxyAI-friendly visual direction.",
    "- Preserve the core message from the source content.",
    "- Avoid duplicating the source content word-for-word.",
    "- Do not claim outcomes that are not proven in the source.",
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

function safeJsonParse(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error("Unable to parse repurposing JSON.");
  }
}

function asDrafts(payload: Record<string, any>, sourceTitle: string): RepurposedAssetDraft[] {
  const entries = [
    ["linkedin_post", "LinkedIn Post"],
    ["facebook_post", "Facebook Post"],
    ["email_teaser", "Email Teaser"],
    ["video_prompt", "Video Prompt"],
  ] as const;

  return entries.map(([key, label]) => {
    const value = payload[key] ?? {};
    const title = read(value.title, `${label}: ${sourceTitle}`);
    const content = read(value.content, "");

    if (!content) {
      throw new Error(`Repurposed ${label} content was empty.`);
    }

    return {
      assetType:
        key === "email_teaser"
          ? "email"
          : key === "video_prompt"
            ? "video_script"
            : key,
      title,
      content,
    };
  });
}

export async function generateRepurposingPack(source: SourceAsset) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const prompt = buildRepurposingPrompt(source);

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

  let rawPayload: Record<string, any>;

  try {
    rawPayload = JSON.parse(text);
  } catch {
    throw new Error(`Unable to parse OpenAI response: ${text.slice(0, 500)}`);
  }

  const outputText = extractTextFromResponsesApi(rawPayload);
  const repurposingJson = safeJsonParse(outputText);

  return {
    model,
    prompt,
    drafts: asDrafts(repurposingJson, source.title),
  };
}
