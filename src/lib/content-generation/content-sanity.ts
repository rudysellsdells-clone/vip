export type ContentSanityResult = {
  ok: boolean;
  issues: string[];
};

const RAW_LABEL_PATTERNS = [
  /\bmonthly objective\s*:/i,
  /\btarget audience\s*:/i,
  /\bprimary offer\s*:/i,
  /\bdifferentiator\s*:/i,
  /\bproof points?\s*:/i,
  /\badditional business context\s*:/i,
  /\bkey topics?\s*:/i,
  /\bprivate generation brief\b/i,
  /\bdo not print\b/i,
  /\binternal campaign\b/i,
  /\binternal week\b/i,
  /\basset id\s*:/i,
  /\breview id\s*:/i,
];

const CAMPAIGN_LABEL_PATTERNS = [
  /(^|\n)#?\s*[A-Za-z]+\s+\d{4}\s+Week\s+\d+\s*:/i,
  /(^|\n)#?\s*Week\s+\d+\s*:/i,
  /(^|\n)#?\s*\d{4}-\d{2}\s+Week\s+\d+\s*:/i,
];

const PLACEHOLDER_PATTERNS = [
  /\bplaceholder\b/i,
  /\blorem ipsum\b/i,
  /\binsert\b.*\bhere\b/i,
  /\bfill in\b/i,
  /\bto be written\b/i,
  /\bwrite about\b/i,
  /\bthis post should\b/i,
  /\bthis email should\b/i,
  /\bthis blog should\b/i,
];


const NONSENSE_OR_FIELD_STITCH_PATTERNS = [
  /\bconnects?\s+[^.!?]{0,80}\s+needs?\s+[^.!?]{0,80}\s+to\s+a\s+believable\s+next\s+step/i,
  /\bthe\s+issue\s+is\s+not\s+just\s+awareness\b/i,
  /\ba\s+practical\s+proof\s+or\s+context\s+point\b/i,
  /\bpreferred\s+business\s+outcome\b/i,
  /\bselected\s+(?:audience|offer|service)\b/i,
  /\bproof\s+points?\s*\/\s*supporting\s+context\b/i,
  /\b[a-z]+\s+needs\s+a\s+clearer\s+way\s+to\s+understand\s+and\s+act\s+on\s+[A-Z]/i,
  /\bto\s+a\s+believable\s+next\s+step\s*:/i,
];

const UNSUPPORTED_CLAIM_PATTERNS = [
  /\bguarantee(?:d|s)?\b.*\b(rankings?|results?|traffic|revenue|leads?)\b/i,
  /\b#1\b.*\bgoogle\b/i,
  /\bproven to increase\b.*\b\d+%/i,
  /\bwe helped\b.*\b\d+%/i,
];

function wordCount(content: string) {
  return content
    .replace(/[#*_`>]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;
}

function hasEndingPunctuation(content: string) {
  const trimmed = content.trim();

  if (!trimmed) return false;

  return /[.!?")\]]$/.test(trimmed);
}

function hasBrokenSentence(content: string) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith("-"))
    .filter((line) => !/^subject\s*:/i.test(line))
    .filter((line) => !/^#\w+/.test(line));

  return lines.some((line) => {
    if (line.length < 18) return false;
    if (line.endsWith(":")) return false;
    if (/[\u{1F300}-\u{1FAFF}]$/u.test(line)) return false;

    return !/[.!?")\]]$/.test(line);
  });
}

function hasSocialFormatting(content: string) {
  return /[\u{1F300}-\u{1FAFF}]/u.test(content) && /(^|\s)#[A-Za-z0-9][A-Za-z0-9_]+/.test(content);
}

export function validatePublishReadyContent({
  content,
  assetType,
}: {
  content: string;
  assetType: string;
}): ContentSanityResult {
  const issues: string[] = [];
  const text = String(content ?? "").trim();
  const words = wordCount(text);

  if (!text) {
    issues.push("Content is empty.");
  }

  if (assetType === "blog_post" && words < 450) {
    issues.push("Blog post is too thin to be publish-ready.");
  }

  if (assetType === "email" && words < 120) {
    issues.push("Email is too thin to be publish-ready.");
  }

  if (assetType === "video_script" && words < 80) {
    issues.push("Video script is too thin to be publish-ready.");
  }

  if (["linkedin_post", "facebook_post"].includes(assetType) && words < 45) {
    issues.push("Social post is too thin to be publish-ready.");
  }

  if (!hasEndingPunctuation(text)) {
    issues.push("Content does not end cleanly.");
  }

  if (hasBrokenSentence(text)) {
    issues.push("Content appears to contain incomplete sentences.");
  }

  if (RAW_LABEL_PATTERNS.some((pattern) => pattern.test(text))) {
    issues.push("Content contains private strategy or internal prompt labels.");
  }

  if (CAMPAIGN_LABEL_PATTERNS.some((pattern) => pattern.test(text))) {
    issues.push("Content contains internal campaign/week labels.");
  }

  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) {
    issues.push("Content contains placeholder or instruction-like wording.");
  }

  if (NONSENSE_OR_FIELD_STITCH_PATTERNS.some((pattern) => pattern.test(text))) {
    issues.push("Content appears to contain stitched field fragments or nonsensical planning language.");
  }

  if (UNSUPPORTED_CLAIM_PATTERNS.some((pattern) => pattern.test(text))) {
    issues.push("Content may contain unsupported factual or performance claims.");
  }

  if (["linkedin_post", "facebook_post"].includes(assetType) && !hasSocialFormatting(text)) {
    issues.push("Social post is missing emoji and/or hashtags.");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
