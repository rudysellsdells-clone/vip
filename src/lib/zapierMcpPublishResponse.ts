/**
 * VIP Zapier MCP Publish Response Normalizer
 *
 * Fixes the false-failure case where Zapier MCP successfully publishes a post
 * but VIP treats the result as an error because url/status/message are null.
 *
 * Success rule:
 * If a Zapier MCP response contains results.id, treat it as a successful publish.
 */

export interface NormalizedPublishSuccess {
  success: true;
  message: string;
  postId: string;
  postUrl: string | null;
  executionId: string | null;
  feedbackUrl: string | null;
  raw: unknown;
}

export interface NormalizedPublishFailure {
  success: false;
  message: string;
  raw: unknown;
}

export type NormalizedPublishResult =
  | NormalizedPublishSuccess
  | NormalizedPublishFailure;

interface SuccessHit {
  id: string;
  url?: string | null;
  executionId?: string | null;
  feedbackUrl?: string | null;
}

export function normalizeZapierMcpPublishResponse(
  response: unknown,
  platformLabel: "Facebook" | "LinkedIn" | "Social" = "Social",
): NormalizedPublishResult {
  const candidates = collectResponseCandidates(response);

  for (const candidate of candidates) {
    const hit = findResultsId(candidate);

    if (hit?.id) {
      return {
        success: true,
        message: `Published successfully to ${platformLabel}.`,
        postId: hit.id,
        postUrl: hit.url ?? deriveFacebookPostUrl(hit.id),
        executionId: hit.executionId ?? null,
        feedbackUrl: hit.feedbackUrl ?? null,
        raw: response,
      };
    }
  }

  return {
    success: false,
    message: "Zapier MCP response did not contain a publish confirmation id.",
    raw: response,
  };
}

function collectResponseCandidates(response: unknown): unknown[] {
  const candidates: unknown[] = [response];

  if (typeof response === "string") {
    const parsed = safeJsonParse(response);
    if (parsed) candidates.push(parsed);

    for (const jsonCandidate of extractJsonObjects(response)) {
      candidates.push(jsonCandidate);
    }
  }

  return candidates;
}

function findResultsId(value: unknown): SuccessHit | null {
  if (typeof value === "string") {
    const parsed = safeJsonParse(value);
    return parsed ? findResultsId(parsed) : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const results = value.results;

  if (isRecord(results) && typeof results.id === "string" && results.id.trim()) {
    const execution = isRecord(value.execution) ? value.execution : null;

    return {
      id: results.id,
      url: typeof results.url === "string" && results.url ? results.url : null,
      executionId:
        execution && typeof execution.id === "string" ? execution.id : null,
      feedbackUrl:
        typeof value.feedbackUrl === "string" && value.feedbackUrl
          ? value.feedbackUrl
          : null,
    };
  }

  /**
   * Common Zapier MCP nesting:
   * raw.result.content[0].text = "{\"results\":{\"id\":\"...\"}, ... }"
   */
  const content = value.content;

  if (Array.isArray(content)) {
    for (const item of content) {
      if (isRecord(item) && typeof item.text === "string") {
        const parsedText = safeJsonParse(item.text);
        if (parsedText) {
          const hit = findResultsId(parsedText);
          if (hit) return hit;
        }
      }
    }
  }

  for (const child of Object.values(value)) {
    const hit = findResultsId(child);
    if (hit) return hit;
  }

  return null;
}

function deriveFacebookPostUrl(objectId: string): string | null {
  /**
   * Facebook object ids commonly come back like:
   * PAGE_ID_POST_ID
   *
   * Example:
   * 30489698262_1777565287102827
   */
  if (!objectId.includes("_")) {
    return null;
  }

  const [pageId, postId] = objectId.split("_");

  if (!pageId || !postId) {
    return null;
  }

  if (!/^\d+$/.test(pageId) || !/^\d+$/.test(postId)) {
    return null;
  }

  return `https://www.facebook.com/${pageId}/posts/${postId}`;
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Conservative balanced-brace JSON extractor for exception/error strings.
 */
function extractJsonObjects(text: string): unknown[] {
  const results: unknown[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (char === "}" && depth > 0) {
      depth--;

      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, i + 1);
        const parsed = safeJsonParse(candidate);
        if (parsed) results.push(parsed);
        start = -1;
      }
    }
  }

  return results;
}
