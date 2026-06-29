import {
  ASSET_TYPE_DETAIL_STANDARDS,
  GENERIC_PHRASE_WARNINGS,
  detailStandardsForAssetType,
} from "@/lib/ai/content-specificity";
import { normalizeReviewList, scoreNumber } from "@/lib/content-quality/review-display";

export type QualityGuidanceTone = "strong" | "good" | "watch" | "needs_work" | "not_reviewed";

export type QualityReviewerGuidance = {
  tone: QualityGuidanceTone;
  headline: string;
  readinessLabel: string;
  scoreSummary: string;
  detailDensityLabel: string;
  genericFlags: string[];
  presentSignals: string[];
  missingSignals: string[];
  checklist: string[];
  nextSteps: string[];
  reviewerQuestions: string[];
};

type GuidanceInput = {
  asset?: Record<string, any> | null;
  review?: Record<string, any> | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeAssetType(value: unknown) {
  const type = cleanText(value).toLowerCase();

  if (type.includes("blog")) return "blog_post";
  if (type.includes("email")) return "email";
  if (type.includes("linkedin")) return "linkedin_post";
  if (type.includes("facebook")) return "facebook_post";
  if (type.includes("video") || type.includes("script")) return "video_script";
  if (type.includes("galaxy") || type.includes("luma") || type.includes("prompt")) {
    return "galaxyai_prompt";
  }

  return type || "general";
}

function wordCount(content: string) {
  return content
    .replace(/[#*_`>]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;
}

function includesPattern(content: string, pattern: RegExp) {
  return pattern.test(content);
}

function detectGenericFlags(content: string) {
  const lower = content.toLowerCase();

  return GENERIC_PHRASE_WARNINGS.filter((phrase) => lower.includes(phrase.toLowerCase())).slice(0, 5);
}

function detectSignals(content: string) {
  const signals = [
    {
      label: "specific audience or buyer situation",
      found: includesPattern(content, /\b(owner|founder|practice manager|marketing leader|contractor|dentist|clinic|dealer|sales team|service business|local business|customer)\b/i),
    },
    {
      label: "real pain point or business consequence",
      found: includesPattern(content, /\b(pain|problem|bottleneck|missed|wasted|leak|delay|risk|cost|confusion|slow|lost|friction|manual|inconsistent)\b/i),
    },
    {
      label: "example, scenario, or before-and-after detail",
      found: includesPattern(content, /\b(example|for instance|scenario|before|after|when a|imagine|instead of|rather than)\b/i),
    },
    {
      label: "workflow, checklist, or practical next step",
      found: includesPattern(content, /\b(step|workflow|checklist|process|audit|review|map|plan|calendar|sequence|playbook|next step)\b/i),
    },
    {
      label: "objection, decision trigger, or buying moment",
      found: includesPattern(content, /\b(objection|hesitation|decision|trigger|ready to|before you|if you are|when you need|concern|compare|choose)\b/i),
    },
    {
      label: "clear CTA connected to the asset purpose",
      found: includesPattern(content, /\b(book|schedule|contact|call|reply|download|request|audit|review|demo|learn more|get started|message us)\b/i),
    },
  ];

  return {
    present: signals.filter((signal) => signal.found).map((signal) => signal.label),
    missing: signals.filter((signal) => !signal.found).map((signal) => signal.label),
  };
}

function scoreTone(score: number | null, missingCount: number, genericCount: number): QualityGuidanceTone {
  if (score === null) return "not_reviewed";
  if (score >= 85 && missingCount <= 1 && genericCount === 0) return "strong";
  if (score >= 75 && missingCount <= 2) return "good";
  if (score >= 65) return "watch";
  return "needs_work";
}

function toneHeadline(tone: QualityGuidanceTone) {
  if (tone === "strong") return "Strong candidate for approval after a quick human read.";
  if (tone === "good") return "Solid draft, but check the specificity before approval.";
  if (tone === "watch") return "Review closely before approval; detail gaps may still be present.";
  if (tone === "needs_work") return "Likely needs a stronger version before publishing.";
  return "Not reviewed yet; run quality review before approval or publishing.";
}

function readinessLabel(tone: QualityGuidanceTone) {
  if (tone === "strong") return "Ready candidate";
  if (tone === "good") return "Human check";
  if (tone === "watch") return "Needs careful review";
  if (tone === "needs_work") return "Improve before approval";
  return "Review not run";
}

function detailDensityLabel(count: number, missingCount: number) {
  if (count >= 450 && missingCount <= 1) return "High detail density";
  if (count >= 220 && missingCount <= 3) return "Moderate detail density";
  if (count >= 80) return "Light detail density";
  return "Very short draft";
}

function fallbackNextSteps(input: {
  score: number | null;
  missingSignals: string[];
  genericFlags: string[];
  improvements: string[];
  suggestedRevision: string;
}) {
  const steps: string[] = [];

  if (input.score === null) {
    steps.push("Run the quality review so VIP can score detail, clarity, CTA strength, and conversion usefulness.");
  }

  if (input.genericFlags.length) {
    steps.push("Replace generic marketing phrases with a concrete buyer problem, example, workflow step, or business consequence.");
  }

  if (input.missingSignals.length) {
    steps.push(`Add ${input.missingSignals.slice(0, 2).join(" and ")}.`);
  }

  if (input.improvements.length) {
    steps.push(...input.improvements.slice(0, 3));
  }

  if (input.suggestedRevision) {
    steps.push("Use the suggested revision as the starting point for the next version.");
  }

  return Array.from(new Set(steps)).slice(0, 5);
}

function reviewerQuestions(assetType: string) {
  const common = [
    "Could this content be pasted onto a random competitor's website without obvious edits? If yes, make it more specific.",
    "Does the reader know what to do next after reading it?",
  ];

  if (assetType === "blog_post") {
    return [
      "Does the post answer a real search or buyer question with enough detail to be useful?",
      "Does it include practical sections, examples, and a clear internal CTA?",
      ...common,
    ];
  }

  if (assetType === "email") {
    return [
      "Is there one clear reason the recipient should care now?",
      "Is the CTA specific and low-friction?",
      ...common,
    ];
  }

  if (assetType === "linkedin_post" || assetType === "facebook_post") {
    return [
      "Does the first line create a real reason to keep reading?",
      "Does the post say something specific, useful, or opinionated instead of generic promotion?",
      ...common,
    ];
  }

  if (assetType === "video_script" || assetType === "galaxyai_prompt") {
    return [
      "Is the first three seconds specific enough to stop the scroll?",
      "Are the visuals, scene direction, audience, and CTA clear enough for production?",
      ...common,
    ];
  }

  return common;
}

export function buildQualityReviewerGuidance({ asset, review }: GuidanceInput): QualityReviewerGuidance {
  const content = cleanText(asset?.content);
  const assetType = normalizeAssetType(asset?.asset_type);
  const overallScore = scoreNumber(review?.overall_score);
  const improvements = normalizeReviewList(review?.improvements);
  const suggestedRevision = cleanText(review?.suggested_revision);
  const genericFlags = content ? detectGenericFlags(content) : [];
  const signals = content ? detectSignals(content) : { present: [], missing: [] };
  const count = content ? wordCount(content) : 0;
  const tone = scoreTone(overallScore, signals.missing.length, genericFlags.length);
  const checklist = (ASSET_TYPE_DETAIL_STANDARDS[assetType] ?? detailStandardsForAssetType(assetType)).slice(0, 5);

  return {
    tone,
    headline: toneHeadline(tone),
    readinessLabel: readinessLabel(tone),
    scoreSummary: overallScore === null ? "No saved score" : `${overallScore}/100 overall`,
    detailDensityLabel: detailDensityLabel(count, signals.missing.length),
    genericFlags,
    presentSignals: signals.present,
    missingSignals: signals.missing,
    checklist,
    nextSteps: fallbackNextSteps({
      score: overallScore,
      missingSignals: signals.missing,
      genericFlags,
      improvements,
      suggestedRevision,
    }),
    reviewerQuestions: reviewerQuestions(assetType),
  };
}
