const INTERNAL_TRACE_PATTERNS = [
  /^Quality resubmission based on review:.*$/i,
  /^Original asset ID:.*$/i,
  /^Original asset id:.*$/i,
  /^Prior asset ID:.*$/i,
  /^Prior asset id:.*$/i,
  /^Previous asset ID:.*$/i,
  /^Previous asset id:.*$/i,
  /^New asset ID:.*$/i,
  /^New asset id:.*$/i,
  /^Source asset ID:.*$/i,
  /^Source asset id:.*$/i,
  /^Source asset:.*$/i,
  /^Regenerated from asset ID:.*$/i,
  /^Regenerated from asset id:.*$/i,
  /^Review ID:.*$/i,
  /^Review id:.*$/i,
];

const CAMPAIGN_LABEL_PATTERNS = [
  /^#?\s*[A-Za-z]+\s+\d{4}\s+Week\s+\d+\s*:.*$/i,
  /^#?\s*Week\s+\d+\s*:.*$/i,
  /^#?\s*\d{4}-\d{2}\s+Week\s+\d+\s*:.*$/i,
];

const LEAKED_CONTEXT_LABEL_PATTERNS = [
  /^PRIVATE\s+(?:MONTHLY PLAN|CALENDAR ITEM|GENERATION)\s+CONTEXT.*$/i,
  /^PRIVATE GENERATION BRIEF.*$/i,
  /^MARKETING SPINE.*$/i,
  /^Content request:.*$/i,
  /^Pre-review detail pass:.*$/i,
  /^Confirm the final asset.*$/i,
  /^Do not include .*raw context.*$/i,
  /^(?:Internal Month|Internal Campaign|Internal Week|Public Title Direction|Asset Type|Asset Slot|Asset Brief|Gate Status|Campaign Objective|Buyer Pain|Positioning Angle|Originality Angle|Primary CTA|Proof Points|Content Pillars|Brand Tone|Avoid|Additional Business Context|Key Topics \/ Weekly Angles|Monthly Objective|Differentiator|Call To Action)\s*:/i,
  /^(?:Month|Theme|Business goal|Target audience|Offer focus|Type|Platform|Scheduled date|Week|Description|Content angle|Linked campaign)\s*:/i,
  /\b(?:preferred business outcome|practical proof or context point|selected audience|selected offer|proof points? \/ supporting context)\b/i,
];

const UUID_LINE_PATTERN =
  /^(?:asset\s*)?(?:id\s*)?:?\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUID_INLINE_LABEL_PATTERN =
  /\b(?:original|prior|previous|new|source|review|asset)\s+asset\s+id\s*:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

function hasInternalTraceLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) return false;

  if (UUID_LINE_PATTERN.test(trimmed)) return true;

  return INTERNAL_TRACE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isCampaignLabelLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) return false;

  return CAMPAIGN_LABEL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isLeakedContextLabelLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) return false;

  return LEAKED_CONTEXT_LABEL_PATTERNS.some((pattern) =>
    pattern.test(trimmed),
  );
}

export function stripInternalTraceContent(content: string | null | undefined) {
  return String(content ?? "")
    .replace(UUID_INLINE_LABEL_PATTERN, "")
    .split("\n")
    .filter((line) => !hasInternalTraceLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripCampaignLabels(content: string | null | undefined) {
  return String(content ?? "")
    .split("\n")
    .filter((line, index) => {
      if (isCampaignLabelLine(line)) return false;
      if (isLeakedContextLabelLine(line)) return false;

      // Also catch a campaign label after an emoji prefix in social content.
      if (index === 0 && /[A-Za-z]+\s+\d{4}\s+Week\s+\d+\s*:/i.test(line)) return false;

      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isSocialAssetType(assetType: string | null | undefined) {
  return ["linkedin_post", "facebook_post"].includes(String(assetType ?? ""));
}

function hasEmoji(content: string) {
  return /[\u{1F300}-\u{1FAFF}]/u.test(content);
}

function hasHashtag(content: string) {
  return /(^|\s)#[A-Za-z0-9][A-Za-z0-9_]+/.test(content);
}

function titleTopic(title: string) {
  const cleaned = title
    .replace(/—\s*(linkedin|facebook)\s*post/i, "")
    .replace(/quality resubmission\s*v?\d*/i, "")
    .replace(/[A-Za-z]+\s+\d{4}\s+Week\s+\d+\s*:/i, "")
    .split("—")
    .map((part) => part.trim())
    .filter(Boolean)
    .pop();

  return cleaned || title;
}

const HASHTAG_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "with",
  "you",
  "your",
]);

const UNSAFE_HASHTAG_SOURCE_PATTERN = /\b(?:youll|you ll|receive|how to solve|preferred business outcome|desired outcome|selected audience|selected offer|proof points?|supporting context|business context|content angle|marketing spine|strategy input|campaign brief)\b/i;

function hashtagFromPhrase(value: string) {
  const cleaned = String(value ?? "")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || UNSAFE_HASHTAG_SOURCE_PATTERN.test(cleaned)) return "";

  const words = cleaned
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => word.length > 2)
    .filter((word) => !HASHTAG_STOP_WORDS.has(word.toLowerCase()))
    .slice(0, 3);

  if (!words.length) return "";

  return `#${words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function topicEmoji(value: string) {
  const lower = value.toLowerCase();

  if (lower.includes("ai") || lower.includes("search")) return "🔎";
  if (lower.includes("local") || lower.includes("google")) return "📍";
  if (lower.includes("content") || lower.includes("blog")) return "✍️";
  if (lower.includes("lead") || lower.includes("sales") || lower.includes("growth")) return "📈";
  if (lower.includes("authority") || lower.includes("trust")) return "🏆";
  if (lower.includes("video")) return "🎥";
  if (lower.includes("email")) return "📬";
  if (lower.includes("review")) return "⭐";
  if (lower.includes("strategy")) return "🧭";

  return "💡";
}

function socialEmojiPrefix({
  assetType,
  title,
  content,
}: {
  assetType: string;
  title: string;
  content: string;
}) {
  const topic = `${title} ${content.slice(0, 180)}`;
  const emojis = [topicEmoji(topic)];

  if (assetType === "linkedin_post") {
    emojis.push("📈", "🤝");
  } else if (assetType === "facebook_post") {
    emojis.push("📣", "✅");
  }

  return unique(emojis).slice(0, 3).join(" ");
}

function socialHashtags({
  assetType,
  title,
  content,
}: {
  assetType: string;
  title: string;
  content: string;
}) {
  const topic = titleTopic(title);
  const combined = `${topic} ${content}`.toLowerCase();
  const inferredTags: string[] = [];

  if (/contractor|construction|trade|trades/.test(combined)) {
    inferredTags.push("#ContractorMarketing");
  }

  if (/ai|aio|search|visibility|google|seo/.test(combined)) {
    inferredTags.push("#AIOptimization", "#LocalSEO");
  }

  if (/audit|visibility audit|marketing audit/.test(combined)) {
    inferredTags.push("#MarketingAudit");
  }

  if (/content|blog|post|social/.test(combined)) {
    inferredTags.push("#ContentMarketing");
  }

  if (/lead|retainer|contract|sales|pipeline|growth/.test(combined)) {
    inferredTags.push("#LeadGeneration");
  }

  const channelTag = assetType === "linkedin_post" ? "#BusinessGrowth" : "#LocalBusiness";

  return unique([
    hashtagFromPhrase(topic),
    ...inferredTags,
    "#WebSearchPros",
    "#DigitalMarketing",
    channelTag,
  ])
    .slice(0, assetType === "linkedin_post" ? 5 : 4)
    .join(" ");
}

export function ensureSocialFormatting({
  content,
  assetType,
  title,
}: {
  content: string;
  assetType: string | null | undefined;
  title: string | null | undefined;
}) {
  let cleaned = stripCampaignLabels(stripInternalTraceContent(content));

  if (!isSocialAssetType(assetType)) {
    return cleaned;
  }

  const normalizedAssetType = String(assetType);
  const safeTitle = String(title ?? "");
  const additions: string[] = [];

  if (!hasEmoji(cleaned)) {
    const prefix = socialEmojiPrefix({
      assetType: normalizedAssetType,
      title: safeTitle,
      content: cleaned,
    });

    if (prefix) {
      cleaned = `${prefix} ${cleaned}`.trim();
    }
  }

  if (!hasHashtag(cleaned)) {
    const hashtags = socialHashtags({
      assetType: normalizedAssetType,
      title: safeTitle,
      content: cleaned,
    });

    if (hashtags) {
      additions.push(hashtags);
    }
  }

  if (additions.length) {
    cleaned = [cleaned, "", ...additions].join("\n").trim();
  }

  return cleaned;
}

export function preparePublicAssetContent({
  content,
  assetType,
  title,
}: {
  content: string | null | undefined;
  assetType: string | null | undefined;
  title: string | null | undefined;
}) {
  return ensureSocialFormatting({
    content: stripCampaignLabels(stripInternalTraceContent(content)),
    assetType,
    title,
  });
}
