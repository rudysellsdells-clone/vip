export type QualityReviewInput = {
  assetId: string;
  title: string;
  assetType: string;
  content: string;
  brandContext?: string;
};

export type QualityReviewResult = {
  overall_score: number;
  brand_voice_score: number;
  clarity_score: number;
  cta_score: number;
  seo_aio_score: number;
  conversion_score: number;
  status: "reviewed" | "needs_revision" | "strong" | "failed";
  summary: string;
  strengths: string[];
  improvements: string[];
  suggested_revision: string;
};

function read(value: unknown, fallback = "") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function systemPrompt() {
  return [
    "You are Rudy's VIP content quality reviewer for Web Search Pros.",
    "Review generated marketing content for brand fit, clarity, CTA strength, SEO/AIO readiness, and conversion value.",
    "Be useful, direct, practical, and honest.",
    "Do not be overly harsh, but do not rubber-stamp weak content.",
    "Return valid JSON only. Do not include markdown fences or extra commentary.",
  ].join("\n");
}

export function buildQualityReviewPrompt(input: QualityReviewInput) {
  const brandContext = read(
    input.brandContext,
    [
      "Brand: Web Search Pros.",
      "Voice: strategic, confident, helpful, plain-English, practical, and business-focused.",
      "Audience: business owners, marketing leaders, and prospects who want better visibility, AI search presence, authority, content, and automation.",
      "Avoid: fake case studies, fake results, fake testimonials, guaranteed rankings, exaggerated claims, generic AI fluff, and robotic phrasing.",
      "Prefer: clear value, useful strategy, strong hooks, specific business language, consultative tone, and practical calls to action.",
    ].join(" ")
  );

  return [
    systemPrompt(),
    "",
    "Brand context:",
    brandContext,
    "",
    "Asset to review:",
    `Asset ID: ${input.assetId}`,
    `Title: ${read(input.title, "Untitled")}`,
    `Type: ${read(input.assetType, "unknown")}`,
    "",
    "Content:",
    read(input.content, ""),
    "",
    "Return this exact JSON shape:",
    "{",
    '  "overall_score": 0,',
    '  "brand_voice_score": 0,',
    '  "clarity_score": 0,',
    '  "cta_score": 0,',
    '  "seo_aio_score": 0,',
    '  "conversion_score": 0,',
    '  "status": "reviewed",',
    '  "summary": "...",',
    '  "strengths": ["...", "..."],',
    '  "improvements": ["...", "..."],',
    '  "suggested_revision": "..."',
    "}",
    "",
    "Scoring rules:",
    "- Scores must be integers from 0 to 100.",
    "- Overall score should reflect the practical usefulness of the asset.",
    "- Brand voice score should reflect fit with Web Search Pros.",
    "- CTA score should reward clear, relevant next steps.",
    "- SEO/AIO score should reward topical clarity, useful headings, FAQ/search intent value, and entity-rich language where relevant.",
    "- Conversion score should reward business value, specificity, and sales usefulness.",
    "",
    "Status rules:",
    '- Use "strong" if overall_score is 85 or higher.',
    '- Use "reviewed" if overall_score is 70 to 84.',
    '- Use "needs_revision" if overall_score is below 70.',
    "",
    "Suggested revision:",
    "- Provide a concise improved version or partial rewrite of the weakest section.",
    "- Do not rewrite the entire asset unless it is very short.",
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

    throw new Error("Unable to parse content quality JSON.");
  }
}

function score(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeStatus(value: unknown, overallScore: number): QualityReviewResult["status"] {
  const status = String(value ?? "").trim();

  if (["reviewed", "needs_revision", "strong", "failed"].includes(status)) {
    return status as QualityReviewResult["status"];
  }

  if (overallScore >= 85) return "strong";
  if (overallScore >= 70) return "reviewed";

  return "needs_revision";
}

function normalizeReview(payload: Record<string, any>): QualityReviewResult {
  const overallScore = score(payload.overall_score);

  return {
    overall_score: overallScore,
    brand_voice_score: score(payload.brand_voice_score),
    clarity_score: score(payload.clarity_score),
    cta_score: score(payload.cta_score),
    seo_aio_score: score(payload.seo_aio_score),
    conversion_score: score(payload.conversion_score),
    status: normalizeStatus(payload.status, overallScore),
    summary: read(payload.summary, "Quality review completed."),
    strengths: stringArray(payload.strengths),
    improvements: stringArray(payload.improvements),
    suggested_revision: read(payload.suggested_revision, ""),
  };
}

export async function reviewAssetQuality(input: QualityReviewInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const prompt = buildQualityReviewPrompt(input);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 2200,
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
  const reviewJson = safeJsonParse(outputText);

  return {
    model,
    prompt,
    review: normalizeReview(reviewJson),
  };
}
