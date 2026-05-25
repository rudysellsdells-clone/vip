import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";

export type AutoQualityScores = {
  overall: number;
  brandVoice: number;
  clarity: number;
  cta: number;
  seoAio: number;
  conversion: number;
};

export type AutoQualityReview = {
  scores: AutoQualityScores;
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestedRevision: string;
  model: string;
  source: "openai" | "heuristic";
};

export type AutoQualityThresholds = {
  overall: number;
  brandVoice: number;
  clarity: number;
  cta: number;
  seoAio: number;
  conversion: number;
};

export const DEFAULT_AUTO_QUALITY_THRESHOLDS: AutoQualityThresholds = {
  overall: Number(process.env.AUTO_QUALITY_OVERALL_THRESHOLD ?? 82),
  brandVoice: Number(process.env.AUTO_QUALITY_BRAND_VOICE_THRESHOLD ?? 78),
  clarity: Number(process.env.AUTO_QUALITY_CLARITY_THRESHOLD ?? 80),
  cta: Number(process.env.AUTO_QUALITY_CTA_THRESHOLD ?? 78),
  seoAio: Number(process.env.AUTO_QUALITY_SEO_AIO_THRESHOLD ?? 72),
  conversion: Number(process.env.AUTO_QUALITY_CONVERSION_THRESHOLD ?? 76),
};

function clampScore(value: unknown, fallback = 70) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function includesAny(content: string, words: string[]) {
  const lower = content.toLowerCase();

  return words.some((word) => lower.includes(word.toLowerCase()));
}

function lineCount(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function hasClearCta(content: string) {
  return includesAny(content, [
    "schedule",
    "book",
    "start",
    "contact",
    "call",
    "review",
    "audit",
    "learn more",
    "next step",
    "reach out",
  ]);
}

function hasUsefulStructure(content: string) {
  return /(^|\n)#{1,3}\s+/.test(content) || /(^|\n)-\s+/.test(content) || lineCount(content) >= 5;
}

function heuristicReview({
  title,
  assetType,
  content,
}: {
  title: string;
  assetType: string;
  content: string;
}): AutoQualityReview {
  const cleaned = preparePublicAssetContent({
    content,
    assetType,
    title,
  });

  const length = cleaned.length;
  const cta = hasClearCta(cleaned);
  const structured = hasUsefulStructure(cleaned);
  const brandRelevant = includesAny(cleaned, [
    "visibility",
    "search",
    "local",
    "authority",
    "content",
    "business",
    "customer",
    "trust",
  ]);

  const social = ["linkedin_post", "facebook_post"].includes(assetType);
  const socialFormatted = !social || (/[\u{1F300}-\u{1FAFF}]/u.test(cleaned) && /(^|\s)#[A-Za-z0-9]/.test(cleaned));

  const clarity = clampScore((length > 220 ? 78 : 66) + (structured ? 10 : 0));
  const ctaScore = clampScore(cta ? 86 : 62);
  const brandVoice = clampScore(brandRelevant ? 82 : 68);
  const seoAio = clampScore(assetType === "blog_post" ? (structured ? 80 : 62) : 76);
  const conversion = clampScore((cta ? 78 : 60) + (brandRelevant ? 8 : 0));
  const overall = clampScore(
    Math.round((clarity + ctaScore + brandVoice + seoAio + conversion + (socialFormatted ? 82 : 62)) / 6)
  );

  const improvements = [
    clarity < 80 ? "Make the message clearer and easier to scan." : "",
    ctaScore < 78 ? "Add a stronger, more specific call to action." : "",
    brandVoice < 78 ? "Tie the message more clearly to visibility, search, trust, or business growth." : "",
    !socialFormatted && social ? "Add relevant emoji and hashtags for the social channel." : "",
  ].filter(Boolean);

  return {
    scores: {
      overall,
      brandVoice,
      clarity,
      cta: ctaScore,
      seoAio,
      conversion,
    },
    summary:
      improvements.length > 0
        ? "Heuristic quality check found improvement opportunities before human review."
        : "Heuristic quality check found the asset ready for human review.",
    strengths: [
      structured ? "The asset has readable structure." : "The asset has a usable first-draft direction.",
      brandRelevant ? "The message is connected to the business visibility theme." : "The content has a usable base angle.",
    ],
    improvements: improvements.length ? improvements : ["No major improvement required before human review."],
    suggestedRevision:
      improvements.length > 0
        ? "Regenerate the asset using the improvement notes while preserving the core topic and intended CTA."
        : "Move this asset to human review.",
    model: "heuristic-v1",
    source: "heuristic",
  };
}

function qualityPrompt({
  title,
  assetType,
  content,
}: {
  title: string;
  assetType: string;
  content: string;
}) {
  return [
    "You are VIP's pre-review content quality scorer for Web Search Pros.",
    "Score this generated marketing asset before a human reviews it.",
    "Return strict JSON only. Do not include markdown fences.",
    "",
    "Score fields from 0 to 100:",
    "- overall",
    "- brandVoice",
    "- clarity",
    "- cta",
    "- seoAio",
    "- conversion",
    "",
    "Also return:",
    "- summary: short plain-English summary",
    "- strengths: array of 2-5 strengths",
    "- improvements: array of 2-6 specific improvements",
    "- suggestedRevision: one paragraph describing exactly how to improve the asset",
    "",
    "Important quality criteria:",
    "- Content must be public-facing and must not include internal campaign labels, IDs, or private prompt notes.",
    "- Social posts should include useful emoji and relevant hashtags.",
    "- Blog content should be structured and useful.",
    "- CTA should be clear and relevant.",
    "- Do not reward fabricated claims, guarantees, rankings, or fake proof.",
    "",
    `Title: ${title}`,
    `Asset Type: ${assetType}`,
    "",
    "Asset content:",
    content,
  ].join("\n");
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) throw new Error("No JSON object found in quality response.");

    return JSON.parse(match[0]);
  }
}

async function openAiReview({
  title,
  assetType,
  content,
}: {
  title: string;
  assetType: string;
  content: string;
}): Promise<AutoQualityReview> {
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
      input: qualityPrompt({ title, assetType, content }),
      max_output_tokens: 2200,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`OpenAI quality scoring failed: ${response.status} ${response.statusText} — ${text.slice(0, 500)}`);
  }

  const payload = parseJsonObject(text);
  const raw =
    typeof payload.output_text === "string"
      ? parseJsonObject(payload.output_text)
      : payload;

  return {
    scores: {
      overall: clampScore(raw.overall),
      brandVoice: clampScore(raw.brandVoice),
      clarity: clampScore(raw.clarity),
      cta: clampScore(raw.cta),
      seoAio: clampScore(raw.seoAio),
      conversion: clampScore(raw.conversion),
    },
    summary: String(raw.summary ?? "Quality scoring completed.").trim(),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String).slice(0, 8) : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.map(String).slice(0, 10) : [],
    suggestedRevision: String(raw.suggestedRevision ?? "Improve the asset based on the quality feedback.").trim(),
    model,
    source: "openai",
  };
}

export async function generateAutoQualityReview({
  title,
  assetType,
  content,
}: {
  title: string;
  assetType: string;
  content: string;
}): Promise<AutoQualityReview> {
  const cleaned = preparePublicAssetContent({
    content,
    assetType,
    title,
  });

  try {
    return await openAiReview({
      title,
      assetType,
      content: cleaned,
    });
  } catch {
    return heuristicReview({
      title,
      assetType,
      content: cleaned,
    });
  }
}

export function passesAutoQualityGate({
  review,
  thresholds = DEFAULT_AUTO_QUALITY_THRESHOLDS,
}: {
  review: AutoQualityReview;
  thresholds?: AutoQualityThresholds;
}) {
  const scores = review.scores;

  return (
    scores.overall >= thresholds.overall &&
    scores.brandVoice >= thresholds.brandVoice &&
    scores.clarity >= thresholds.clarity &&
    scores.cta >= thresholds.cta &&
    scores.seoAio >= thresholds.seoAio &&
    scores.conversion >= thresholds.conversion
  );
}

export function failingScoreLabels({
  review,
  thresholds = DEFAULT_AUTO_QUALITY_THRESHOLDS,
}: {
  review: AutoQualityReview;
  thresholds?: AutoQualityThresholds;
}) {
  const scores = review.scores;
  const failures: string[] = [];

  if (scores.overall < thresholds.overall) failures.push(`overall ${scores.overall}/${thresholds.overall}`);
  if (scores.brandVoice < thresholds.brandVoice) failures.push(`brand voice ${scores.brandVoice}/${thresholds.brandVoice}`);
  if (scores.clarity < thresholds.clarity) failures.push(`clarity ${scores.clarity}/${thresholds.clarity}`);
  if (scores.cta < thresholds.cta) failures.push(`CTA ${scores.cta}/${thresholds.cta}`);
  if (scores.seoAio < thresholds.seoAio) failures.push(`SEO/AIO ${scores.seoAio}/${thresholds.seoAio}`);
  if (scores.conversion < thresholds.conversion) failures.push(`conversion ${scores.conversion}/${thresholds.conversion}`);

  return failures;
}
