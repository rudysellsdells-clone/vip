export const MAGICA_PROMPT_HARD_LIMIT = 3500;
export const MAGICA_PROMPT_SAFE_LIMIT = 3400;

export type CompactMagicaPromptResult = {
  prompt: string;
  originalLength: number;
  sentLength: number;
  wasCompacted: boolean;
  limit: number;
};

type PromptParagraph = {
  index: number;
  text: string;
  score: number;
};

function normalizePrompt(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function paragraphKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreParagraph(text: string, index: number) {
  const lower = text.toLowerCase();
  let score = index === 0 ? 120 : 10;

  const highValueTerms = [
    "create a ",
    "campaign:",
    "campaign angle:",
    "target audience:",
    "target viewer:",
    "featured service",
    "featured offer",
    "platform format:",
    "platform tone:",
    "layout direction:",
    "video title/theme:",
    "strategic angle:",
    "post copy this image supports:",
    "approved video script",
    "creative source:",
  ];

  const creativeTerms = [
    "creative direction:",
    "production direction:",
    "visual direction",
    "shared visual system:",
    "scene",
    "composition",
    "lighting",
    "visual tone",
    "branding:",
    "motion:",
  ];

  const controlTerms = [
    "cta",
    "artifact control",
    "quality requirements",
    "output requirement",
    "output goal",
    "avoid ",
    "do not ",
    "on-screen text",
    "text overlay",
  ];

  for (const term of highValueTerms) {
    if (lower.includes(term)) score += 80;
  }

  for (const term of creativeTerms) {
    if (lower.includes(term)) score += 45;
  }

  for (const term of controlTerms) {
    if (lower.includes(term)) score += 25;
  }

  if (lower.includes("private brief") || lower.includes("internal instruction")) {
    score -= 80;
  }

  return score;
}

function truncateAtBoundary(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  if (maxLength <= 0) return "";

  const slice = text.slice(0, maxLength);
  const minimumBoundary = Math.floor(maxLength * 0.7);
  const boundary = Math.max(
    slice.lastIndexOf("\n"),
    slice.lastIndexOf(". "),
    slice.lastIndexOf("; "),
    slice.lastIndexOf(", "),
    slice.lastIndexOf(" "),
  );

  const trimmed = boundary >= minimumBoundary ? slice.slice(0, boundary) : slice;
  return trimmed.trimEnd();
}

function uniqueParagraphs(prompt: string) {
  const seen = new Set<string>();
  const paragraphs: PromptParagraph[] = [];

  prompt.split(/\n\s*\n/).forEach((rawParagraph, index) => {
    const text = rawParagraph.trim();
    if (!text) return;

    const key = paragraphKey(text);
    if (!key || seen.has(key)) return;

    seen.add(key);
    paragraphs.push({
      index,
      text,
      score: scoreParagraph(text, index),
    });
  });

  return paragraphs;
}

export function compactMagicaPrompt(
  value: unknown,
  maxLength = MAGICA_PROMPT_SAFE_LIMIT,
): CompactMagicaPromptResult {
  const normalized = normalizePrompt(value);
  const safeLimit = Math.max(200, Math.min(maxLength, MAGICA_PROMPT_HARD_LIMIT));
  const originalLength = normalized.length;

  if (originalLength <= safeLimit) {
    return {
      prompt: normalized,
      originalLength,
      sentLength: originalLength,
      wasCompacted: false,
      limit: safeLimit,
    };
  }

  const paragraphs = uniqueParagraphs(normalized);
  const ranked = [...paragraphs].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  const selected = new Map<number, string>();
  let usedLength = 0;

  for (const paragraph of ranked) {
    const separatorLength = selected.size ? 2 : 0;
    const remaining = safeLimit - usedLength - separatorLength;
    if (remaining <= 0) break;

    if (paragraph.text.length <= remaining) {
      selected.set(paragraph.index, paragraph.text);
      usedLength += separatorLength + paragraph.text.length;
      continue;
    }

    if (paragraph.score >= 70 && remaining >= 160) {
      const shortened = truncateAtBoundary(paragraph.text, remaining);
      if (shortened) {
        selected.set(paragraph.index, shortened);
        usedLength += separatorLength + shortened.length;
      }
    }
  }

  let compacted = [...selected.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, text]) => text)
    .join("\n\n")
    .trim();

  if (!compacted) {
    compacted = truncateAtBoundary(normalized, safeLimit);
  }

  if (compacted.length > safeLimit) {
    compacted = truncateAtBoundary(compacted, safeLimit);
  }

  return {
    prompt: compacted,
    originalLength,
    sentLength: compacted.length,
    wasCompacted: compacted.length < originalLength,
    limit: safeLimit,
  };
}
