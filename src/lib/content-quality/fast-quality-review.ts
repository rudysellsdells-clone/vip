import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";

export type FastQualityReview = {
  scores: {
    overall: number;
    brandVoice: number;
    clarity: number;
    cta: number;
    seoAio: number;
    conversion: number;
  };
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestedRevision: string;
  model: string;
  source: "heuristic";
};

const SOCIAL_TYPES = new Set(["linkedin_post", "facebook_post"]);

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

function includesAny(content: string, terms: string[]) {
  const lower = content.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function hasCta(content: string) {
  return includesAny(content, [
    "schedule",
    "book",
    "contact",
    "call",
    "review",
    "audit",
    "learn more",
    "reach out",
    "message",
    "get started",
    "next step",
  ]);
}

function hasStructure(content: string) {
  return /(^|\n)#{1,3}\s+/.test(content) || /(^|\n)-\s+/.test(content) || lineCount(content) >= 4;
}

function hasEmoji(content: string) {
  return /[\u{1F300}-\u{1FAFF}]/u.test(content);
}

function hasHashtag(content: string) {
  return /(^|\s)#[A-Za-z0-9][A-Za-z0-9_]+/.test(content);
}

function hasInternalLabels(content: string) {
  return (
    /\basset id\b/i.test(content) ||
    /\breview id\b/i.test(content) ||
    /\binternal campaign\b/i.test(content) ||
    /\bmonthly objective\s*:/i.test(content) ||
    /\btarget audience\s*:/i.test(content) ||
    /(^|\n)#?\s*[A-Za-z]+\s+\d{4}\s+Week\s+\d+\s*:/i.test(content)
  );
}

function hasUnsupportedClaims(content: string) {
  return (
    /\bguarantee(?:d|s)?\b.*\b(rankings?|results?|traffic|revenue|leads?)\b/i.test(content) ||
    /\b#1\b.*\bgoogle\b/i.test(content) ||
    /\bwe helped\b.*\b\d+%/i.test(content)
  );
}

export function generateFastQualityReview({
  title,
  assetType,
  content,
}: {
  title: string;
  assetType: string;
  content: string;
}): FastQualityReview {
  const cleaned = preparePublicAssetContent({
    title,
    assetType,
    content,
  });

  const words = wordCount(cleaned);
  const isSocial = SOCIAL_TYPES.has(assetType);
  const cta = hasCta(cleaned);
  const structured = hasStructure(cleaned);
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
    "website",
    "seo",
  ]);

  const socialFormatted = !isSocial || (hasEmoji(cleaned) && hasHashtag(cleaned));
  const internalLabels = hasInternalLabels(cleaned);
  const unsupportedClaims = hasUnsupportedClaims(cleaned);

  const minimumWords = assetType === "blog_post" ? 350 : assetType === "email" ? 90 : isSocial ? 35 : 70;
  const enoughLength = words >= minimumWords;

  let clarity = 70 + (enoughLength ? 10 : -8) + (structured ? 6 : 0);
  let ctaScore = cta ? 82 : 64;
  let brandVoice = brandRelevant ? 82 : 68;
  let seoAio = assetType === "blog_post" ? (structured ? 78 : 68) : brandRelevant ? 72 : 64;
  let conversion = cta ? 78 : 64;

  if (isSocial && socialFormatted) {
    clarity += 4;
    conversion += 4;
  }

  if (internalLabels) {
    clarity -= 20;
    brandVoice -= 15;
  }

  if (unsupportedClaims) {
    brandVoice -= 18;
    conversion -= 12;
    seoAio -= 12;
  }

  const scores = {
    overall: 0,
    brandVoice: clamp(brandVoice),
    clarity: clamp(clarity),
    cta: clamp(ctaScore),
    seoAio: clamp(seoAio),
    conversion: clamp(conversion),
  };

  scores.overall = clamp(
    (scores.brandVoice + scores.clarity + scores.cta + scores.seoAio + scores.conversion) / 5
  );

  const strengths = [
    structured ? "The asset has readable structure." : "",
    brandRelevant ? "The message connects to visibility, search, trust, or business growth." : "",
    cta ? "The asset includes a clear next step." : "",
    isSocial && socialFormatted ? "The social post includes emoji and hashtags." : "",
  ].filter(Boolean);

  const improvements = [
    !enoughLength ? "Add more useful substance before approval." : "",
    !cta ? "Add a clearer call to action." : "",
    !brandRelevant ? "Tie the message more clearly to the business value proposition." : "",
    isSocial && !socialFormatted ? "Add natural emoji and relevant hashtags." : "",
    internalLabels ? "Remove internal labels, campaign names, IDs, or prompt-style text." : "",
    unsupportedClaims ? "Remove unsupported guarantees, rankings, statistics, or claims." : "",
  ].filter(Boolean);

  return {
    scores,
    summary:
      improvements.length > 0
        ? "Fast quality review completed. This asset needs minor human review before approval."
        : "Fast quality review completed. This asset appears ready for approval review.",
    strengths: strengths.length ? strengths : ["The asset has a usable first-draft direction."],
    improvements: improvements.length ? improvements : ["No major improvement required before approval review."],
    suggestedRevision:
      improvements.length > 0
        ? "Revise the asset to improve clarity, strengthen the CTA, and remove any internal or unsupported language while preserving the core idea."
        : "Move this asset to approval review.",
    model: "fast-deterministic-quality-v1",
    source: "heuristic",
  };
}

export function fastQualityPasses({
  review,
  assetType,
}: {
  review: FastQualityReview;
  assetType: string;
}) {
  const thresholds = assetType === "blog_post"
    ? { overall: 74, brandVoice: 70, clarity: 72, cta: 66, seoAio: 68, conversion: 66 }
    : SOCIAL_TYPES.has(assetType)
      ? { overall: 70, brandVoice: 66, clarity: 68, cta: 62, seoAio: 56, conversion: 62 }
      : { overall: 72, brandVoice: 68, clarity: 70, cta: 64, seoAio: 62, conversion: 64 };

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
