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
  overall: Number(process.env.AUTO_QUALITY_OVERALL_THRESHOLD ?? 74),
  brandVoice: Number(process.env.AUTO_QUALITY_BRAND_VOICE_THRESHOLD ?? 70),
  clarity: Number(process.env.AUTO_QUALITY_CLARITY_THRESHOLD ?? 72),
  cta: Number(process.env.AUTO_QUALITY_CTA_THRESHOLD ?? 68),
  seoAio: Number(process.env.AUTO_QUALITY_SEO_AIO_THRESHOLD ?? 64),
  conversion: Number(process.env.AUTO_QUALITY_CONVERSION_THRESHOLD ?? 68),
};

const SOCIAL_TYPES = new Set(["linkedin_post", "facebook_post"]);
const SHORT_FORM_TYPES = new Set(["linkedin_post", "facebook_post", "email", "video_script"]);

function clampScore(value: unknown, fallback = 74) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function includesAny(content: string, words: string[]) {
  const lower = content.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function wordCount(content: string) {
  return content
    .replace(/[#*_`>]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;
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
    "message",
    "get started",
  ]);
}

function hasUsefulStructure(content: string) {
  return /(^|\n)#{1,3}\s+/.test(content) || /(^|\n)-\s+/.test(content) || lineCount(content) >= 4;
}

function hasSocialFormatting(content: string) {
  return /[\u{1F300}-\u{1FAFF}]/u.test(content) && /(^|\s)#[A-Za-z0-9]/.test(content);
}

function assetTypeThresholds(assetType: string): AutoQualityThresholds {
  if (SOCIAL_TYPES.has(assetType)) {
    return {
      overall: Number(process.env.AUTO_QUALITY_SOCIAL_OVERALL_THRESHOLD ?? 72),
      brandVoice: Number(process.env.AUTO_QUALITY_SOCIAL_BRAND_VOICE_THRESHOLD ?? 68),
      clarity: Number(process.env.AUTO_QUALITY_SOCIAL_CLARITY_THRESHOLD ?? 70),
      cta: Number(process.env.AUTO_QUALITY_SOCIAL_CTA_THRESHOLD ?? 64),
      seoAio: Number(process.env.AUTO_QUALITY_SOCIAL_SEO_AIO_THRESHOLD ?? 58),
      conversion: Number(process.env.AUTO_QUALITY_SOCIAL_CONVERSION_THRESHOLD ?? 64),
    };
  }

  if (assetType === "blog_post") {
    return {
      overall: Number(process.env.AUTO_QUALITY_BLOG_OVERALL_THRESHOLD ?? 76),
      brandVoice: Number(process.env.AUTO_QUALITY_BLOG_BRAND_VOICE_THRESHOLD ?? 72),
      clarity: Number(process.env.AUTO_QUALITY_BLOG_CLARITY_THRESHOLD ?? 74),
      cta: Number(process.env.AUTO_QUALITY_BLOG_CTA_THRESHOLD ?? 68),
      seoAio: Number(process.env.AUTO_QUALITY_BLOG_SEO_AIO_THRESHOLD ?? 70),
      conversion: Number(process.env.AUTO_QUALITY_BLOG_CONVERSION_THRESHOLD ?? 68),
    };
  }

  return DEFAULT_AUTO_QUALITY_THRESHOLDS;
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
  const cleaned = preparePublicAssetContent({ content, assetType, title });
  const words = wordCount(cleaned);
  const isSocial = SOCIAL_TYPES.has(assetType);
  const isShortForm = SHORT_FORM_TYPES.has(assetType);
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
    "growth",
    "review",
  ]);
  const socialFormatted = !isSocial || hasSocialFormatting(cleaned);
  const enoughLength = isShortForm ? words >= 35 : words >= 120;

  const clarity = clampScore(68 + (enoughLength ? 10 : 0) + (structured ? 8 : 0));
  const ctaScore = clampScore(cta ? 82 : 68);
  const brandVoice = clampScore(brandRelevant ? 82 : 70);
  const seoAio = clampScore(assetType === "blog_post" ? (structured ? 76 : 66) : 72);
  const conversion = clampScore((cta ? 78 : 66) + (brandRelevant ? 6 : 0));
  const socialScore = clampScore(socialFormatted ? 82 : 68);
  const overall = clampScore(
    Math.round((clarity + ctaScore + brandVoice + seoAio + conversion + socialScore) / 6)
  );

  const improvements = [
    !enoughLength ? "Add a little more useful substance before review." : "",
    clarity < 72 ? "Make the message clearer and easier to scan." : "",
    ctaScore < 70 ? "Make the call to action more specific." : "",
    brandVoice < 72 ? "Tie the message more clearly to visibility, search, trust, or business growth." : "",
    !socialFormatted && isSocial ? "Add relevant emoji and hashtags for the social channel." : "",
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
        ? "Fallback quality check found a few improvement opportunities before human review."
        : "Fallback quality check found the asset ready for human review.",
    strengths: [
      structured ? "The asset has readable structure." : "The asset has a usable first-draft direction.",
      brandRelevant ? "The message is connected to the business visibility theme." : "The content has a usable base angle.",
      socialFormatted && isSocial ? "The social post includes channel formatting." : "",
    ].filter(Boolean),
    improvements: improvements.length ? improvements : ["No major improvement required before human review."],
    suggestedRevision:
      improvements.length > 0
        ? "Improve the asset lightly while preserving the core topic, channel format, and intended CTA."
        : "Move this asset to human review.",
    model: "heuristic-v2-calibrated",
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
  const typeInstructions = SOCIAL_TYPES.has(assetType)
    ? [
        "This is a short-form social post. Do not judge it like a blog post.",
        "Reward concise useful copy, natural emoji, relevant hashtags, a clear point, and a clear next step.",
        "Do not penalize the asset for being short if it is appropriate for the channel.",
      ]
    : assetType === "blog_post"
      ? [
          "This is a blog post. Reward structure, usefulness, topical clarity, scannability, and a clear next step.",
          "Do not require fabricated case studies, fake metrics, fake guarantees, or invented proof.",
        ]
      : [
          "Judge this asset based on its channel and purpose. Do not apply blog-length expectations to short-form content.",
        ];

  return [
    "You are VIP's pre-review content quality scorer for Web Search Pros.",
    "Score this generated marketing asset before a human reviews it.",
    "Return strict JSON only. Do not include markdown fences.",
    "",
    ...typeInstructions,
    "",
    "Score fields from 0 to 100:",
    "- overall",
    "- brandVoice",
    "- clarity",
    "- cta",
    "- seoAio",
    "- conversion",
    "",
    "Use this scale:",
    "90-100: excellent and publish-ready after a quick human glance",
    "80-89: strong and likely review-ready",
    "70-79: acceptable first-pass content with minor improvement opportunities",
    "60-69: needs targeted revision",
    "below 60: significant quality issue",
    "",
    "Also return:",
    "- summary: short plain-English summary",
    "- strengths: array of 2-5 strengths",
    "- improvements: array of 2-6 specific improvements",
    "- suggestedRevision: one paragraph describing exactly how to improve the asset if needed",
    "",
    "Important quality criteria:",
    "- Content must be public-facing and must not include internal campaign labels, IDs, or private prompt notes.",
    "- Social posts should include useful emoji and relevant hashtags.",
    "- Blog content should be structured and useful.",
    "- CTA should be clear and relevant.",
    "- Do not reward fabricated claims, guarantees, rankings, traffic, revenue, testimonials, or fake proof.",
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

function extractOutputText(payload: Record<string, any>) {
  if (typeof payload.output_text === "string") return payload.output_text;

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

  return parts.join("\n");
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

  const envelope = parseJsonObject(text);
  const outputText = extractOutputText(envelope);
  const raw = outputText ? parseJsonObject(outputText) : envelope;

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
  const cleaned = preparePublicAssetContent({ content, assetType, title });

  try {
    return await openAiReview({ title, assetType, content: cleaned });
  } catch {
    return heuristicReview({ title, assetType, content: cleaned });
  }
}

export function thresholdsForAssetType(assetType: string | null | undefined) {
  return assetTypeThresholds(String(assetType ?? ""));
}

export function passesAutoQualityGate({
  review,
  assetType,
  thresholds,
}: {
  review: AutoQualityReview;
  assetType?: string | null;
  thresholds?: AutoQualityThresholds;
}) {
  const scores = review.scores;
  const activeThresholds = thresholds ?? assetTypeThresholds(String(assetType ?? ""));

  return (
    scores.overall >= activeThresholds.overall &&
    scores.brandVoice >= activeThresholds.brandVoice &&
    scores.clarity >= activeThresholds.clarity &&
    scores.cta >= activeThresholds.cta &&
    scores.seoAio >= activeThresholds.seoAio &&
    scores.conversion >= activeThresholds.conversion
  );
}

export function failingScoreLabels({
  review,
  assetType,
  thresholds,
}: {
  review: AutoQualityReview;
  assetType?: string | null;
  thresholds?: AutoQualityThresholds;
}) {
  const scores = review.scores;
  const activeThresholds = thresholds ?? assetTypeThresholds(String(assetType ?? ""));
  const failures: string[] = [];

  if (scores.overall < activeThresholds.overall) failures.push(`overall ${scores.overall}/${activeThresholds.overall}`);
  if (scores.brandVoice < activeThresholds.brandVoice) failures.push(`brand voice ${scores.brandVoice}/${activeThresholds.brandVoice}`);
  if (scores.clarity < activeThresholds.clarity) failures.push(`clarity ${scores.clarity}/${activeThresholds.clarity}`);
  if (scores.cta < activeThresholds.cta) failures.push(`CTA ${scores.cta}/${activeThresholds.cta}`);
  if (scores.seoAio < activeThresholds.seoAio) failures.push(`SEO/AIO ${scores.seoAio}/${activeThresholds.seoAio}`);
  if (scores.conversion < activeThresholds.conversion) failures.push(`conversion ${scores.conversion}/${activeThresholds.conversion}`);

  return failures;
}
