export type NormalizedZapierResult = {
  success: boolean;
  isError: boolean;
  summary: string;
  externalId: string | null;
  externalUrl: string | null;
  rawText: string | null;
  parsedText: unknown | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function getZapierToolText(result: unknown) {
  if (!isRecord(result) || !Array.isArray(result.content)) {
    return null;
  }

  const text = result.content
    .map((item) => {
      if (!isRecord(item)) return null;
      return typeof item.text === "string" ? item.text : null;
    })
    .filter((item): item is string => Boolean(item))
    .join("\n");

  return text.trim().length ? text : null;
}

function findFirstStringByKeys(
  value: unknown,
  keys: string[],
  depth = 0
): string | null {
  if (depth > 5) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findFirstStringByKeys(item, keys, depth + 1);
      if (match) return match;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;
    if (typeof candidate === "number") return String(candidate);
  }

  for (const nestedValue of Object.values(value)) {
    const match = findFirstStringByKeys(nestedValue, keys, depth + 1);
    if (match) return match;
  }

  return null;
}

function getErrorText(result: unknown, parsedText: unknown | null, rawText: string | null) {
  if (isRecord(parsedText) && typeof parsedText.error === "string") return parsedText.error;
  if (isRecord(result) && typeof result.error === "string") return result.error;
  return rawText ?? "Zapier returned an error.";
}

export function normalizeZapierToolResult(result: unknown): NormalizedZapierResult {
  const rawText = getZapierToolText(result);
  const parsedText = rawText ? safeJsonParse(rawText) : null;

  const isError =
    (isRecord(result) && result.isError === true) ||
    (isRecord(parsedText) && parsedText.isError === true);

  const idKeys = [
    "id",
    "post_id",
    "postId",
    "draft_id",
    "draftId",
    "message_id",
    "messageId",
  ];

  const urlKeys = [
    "url",
    "html_url",
    "web_url",
    "draft_url",
    "post_url",
    "permalink_url",
  ];

  const externalId = findFirstStringByKeys(parsedText, idKeys) ?? findFirstStringByKeys(result, idKeys);
  const externalUrl = findFirstStringByKeys(parsedText, urlKeys) ?? findFirstStringByKeys(result, urlKeys);

  if (isError) {
    return {
      success: false,
      isError: true,
      summary: getErrorText(result, parsedText, rawText),
      externalId,
      externalUrl,
      rawText,
      parsedText,
    };
  }

  return {
    success: true,
    isError: false,
    summary: externalId
      ? `Zapier completed successfully. External ID: ${externalId}`
      : rawText ?? "Zapier completed successfully.",
    externalId,
    externalUrl,
    rawText,
    parsedText,
  };
}

export function assertZapierToolResultHasNoError(result: unknown) {
  const normalized = normalizeZapierToolResult(result);
  if (normalized.isError) throw new Error(normalized.summary);
}
