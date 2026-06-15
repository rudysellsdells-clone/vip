function valueToText(value: unknown) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseJsonMaybe(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function valueStringOrNull(value: unknown) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  return text ? text : null;
}

function successStatus(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return ["published", "completed", "success", "succeeded", "created"].includes(normalized);
}

function explicitErrorMessage(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    const text = value.trim();
    const lower = text.toLowerCase();

    if (
      lower.startsWith("mcp error") ||
      lower.startsWith("zapier mcp request failed") ||
      lower.startsWith("error from app") ||
      lower.includes("input validation error") ||
      lower.includes("invalid arguments for tool")
    ) {
      return text;
    }

    const parsed = parseJsonMaybe(text);

    if (parsed) {
      return explicitErrorMessage(parsed);
    }

    return null;
  }

  if (!isRecord(value)) return null;

  if (value.isError === true || value.result?.isError === true) {
    return valueToText(value.error ?? value.message ?? value);
  }

  if (value.error) {
    return valueToText(value.error);
  }

  if (value.errorDetails?.message) {
    return valueToText(value.errorDetails.message);
  }

  if (value.raw?.error) {
    return valueToText(value.raw.error);
  }

  if (value.raw?.isError === true || value.raw?.result?.isError === true) {
    return valueToText(value.raw);
  }

  if (value.parsedText) {
    const parsedTextError = explicitErrorMessage(value.parsedText);
    if (parsedTextError) return parsedTextError;
  }

  if (typeof value.text === "string") {
    const textError = explicitErrorMessage(value.text);
    if (textError) return textError;
  }

  const content = value.raw?.result?.content ?? value.result?.content ?? value.content;

  if (Array.isArray(content)) {
    for (const item of content) {
      if (!isRecord(item) || typeof item.text !== "string") continue;

      const itemError = explicitErrorMessage(item.text);
      if (itemError) return itemError;
    }
  }

  return null;
}

function hasFollowUpOrPreview(value: unknown) {
  const candidates = providerPayloadCandidates(value);

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;

    if (candidate.followUpQuestion) return true;
    if (candidate.isPreview === true) return true;
  }

  const text = valueToText(value).toLowerCase();

  return (
    text.includes("followupquestion") ||
    text.includes("follow-up question") ||
    text.includes("could you please provide") ||
    text.includes("i need the actual content") ||
    text.includes("need the actual content") ||
    text.includes("ispreview")
  );
}

function contentTextPayloads(value: unknown) {
  const out: unknown[] = [];

  function addFromContent(content: unknown) {
    if (!Array.isArray(content)) return;

    for (const item of content) {
      if (!isRecord(item) || typeof item.text !== "string") continue;

      out.push(item.text);

      const parsed = parseJsonMaybe(item.text);
      if (parsed) out.push(parsed);
    }
  }

  if (isRecord(value)) {
    addFromContent(value.content);
    addFromContent(value.result?.content);
    addFromContent(value.raw?.result?.content);
  }

  return out;
}

function providerPayloadCandidates(value: unknown) {
  const candidates: unknown[] = [];

  if (!value) return candidates;

  candidates.push(value);

  if (isRecord(value)) {
    if (value.parsedText) candidates.push(value.parsedText);

    const parsedText = parseJsonMaybe(value.text);
    if (parsedText) candidates.push(parsedText);

    if (value.raw?.result) candidates.push(value.raw.result);
    if (value.raw?.result?.structuredContent) {
      candidates.push(value.raw.result.structuredContent);
    }

    if (value.result) candidates.push(value.result);
    if (value.results) candidates.push({ results: value.results });

    candidates.push(...contentTextPayloads(value));
  }

  return candidates;
}

export type McpProviderSuccessEvidence = {
  ok: boolean;
  recordId: string | null;
  url: string | null;
  status: string | null;
  message: string | null;
  executionId: string | null;
  source: string | null;
};

function emptyEvidence(): McpProviderSuccessEvidence {
  return {
    ok: false,
    recordId: null,
    url: null,
    status: null,
    message: null,
    executionId: null,
    source: null,
  };
}

function evidenceFromCandidate(candidate: unknown): McpProviderSuccessEvidence | null {
  if (!isRecord(candidate)) return null;

  const resultObject = isRecord(candidate.results)
    ? candidate.results
    : isRecord(candidate.result)
      ? candidate.result
      : candidate;

  // Do not treat VIP's own request payload as provider success evidence.
  // It can contain asset_id, campaign_id, text, company_id, urls in post copy, etc.
  if (
    resultObject === candidate &&
    (candidate.requestArguments || candidate.params || candidate.mcpRequestArguments)
  ) {
    return null;
  }

  const recordId =
    valueStringOrNull(resultObject.record_id) ??
    valueStringOrNull(resultObject.recordId) ??
    valueStringOrNull(resultObject.post_id) ??
    valueStringOrNull(resultObject.postId) ??
    valueStringOrNull(resultObject.share_id) ??
    valueStringOrNull(resultObject.id);

  const url =
    stringOrNull(resultObject.url) ??
    stringOrNull(resultObject.link) ??
    stringOrNull(resultObject.permalink) ??
    stringOrNull(resultObject.permalink_url);

  const status = valueStringOrNull(
    resultObject.status ?? resultObject.lifecycleState ?? candidate.status ?? candidate.lifecycleState
  );

  const message = stringOrNull(resultObject.message) ?? stringOrNull(candidate.message);
  const executionId = valueStringOrNull(candidate.execution?.id ?? candidate.executionId);

  const hasProviderRecord = Boolean(recordId || url);
  const hasPublishedStatus = successStatus(status);

  if (!hasProviderRecord && !hasPublishedStatus) {
    return null;
  }

  // A bare execution id proves Zapier may have run, but it does not prove the provider created a post/draft.
  // A provider record/url or published/created status must be present.
  return {
    ok: true,
    recordId,
    url,
    status,
    message,
    executionId,
    source: candidate.results ? "results" : "provider_result",
  };
}

export function getMcpProviderSuccessEvidence(result: unknown): McpProviderSuccessEvidence {
  for (const candidate of providerPayloadCandidates(result)) {
    const evidence = evidenceFromCandidate(candidate);

    if (evidence?.ok) {
      return evidence;
    }
  }

  return emptyEvidence();
}

export function assertSuccessfulMcpResult(
  result: unknown,
  options: { requireSuccessEvidence?: boolean } = {}
) {
  const requireSuccessEvidence = options.requireSuccessEvidence ?? true;

  if (!result || typeof result !== "object") {
    throw new Error("ZapierMCP did not return a valid result object.");
  }

  const explicitError = explicitErrorMessage(result);

  if (explicitError) {
    throw new Error(`ZapierMCP returned an error response: ${explicitError.slice(0, 1000)}`);
  }

  const providerEvidence = getMcpProviderSuccessEvidence(result);

  if (providerEvidence.ok) {
    return providerEvidence;
  }

  if (hasFollowUpOrPreview(result)) {
    throw new Error(
      `ZapierMCP asked for more information instead of confirming execution: ${valueToText(result).slice(0, 1000)}`
    );
  }

  if (requireSuccessEvidence) {
    throw new Error(
      [
        "ZapierMCP did not return remote provider success evidence.",
        "VIP may have built valid request arguments, but it will not mark the asset published unless the MCP response contains provider proof such as results.record_id, results.url, or status PUBLISHED/CREATED.",
        `Response preview: ${valueToText(result).slice(0, 1000)}`,
      ].join(" ")
    );
  }

  return providerEvidence;
}
