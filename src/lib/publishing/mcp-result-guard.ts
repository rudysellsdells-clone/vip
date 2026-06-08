function valueToText(value: unknown) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function walk(value: unknown): unknown[] {
  const seen = new Set<unknown>();
  const out: unknown[] = [];

  function visit(item: unknown) {
    if (!item || typeof item !== "object") {
      out.push(item);
      return;
    }

    if (seen.has(item)) return;
    seen.add(item);
    out.push(item);

    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }

    for (const child of Object.values(item as Record<string, unknown>)) {
      visit(child);
    }
  }

  visit(value);
  return out;
}

function parseJsonMaybe(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hasFollowUpOrPreview(value: unknown) {
  for (const item of walk(value)) {
    if (!item || typeof item !== "object") continue;

    const objectValue = item as Record<string, any>;

    if (objectValue.followUpQuestion) return true;
    if (objectValue.isPreview === true) return true;

    if (typeof objectValue.text === "string") {
      const parsedText = parseJsonMaybe(objectValue.text);
      if (parsedText && hasFollowUpOrPreview(parsedText)) return true;
    }
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

  if (typeof value !== "object") return null;

  const objectValue = value as Record<string, any>;

  if (objectValue.isError === true || objectValue.result?.isError === true) {
    return valueToText(objectValue.error ?? objectValue.message ?? value);
  }

  if (objectValue.error) {
    return valueToText(objectValue.error);
  }

  if (objectValue.errorDetails?.message) {
    return valueToText(objectValue.errorDetails.message);
  }

  if (objectValue.raw?.error) {
    return valueToText(objectValue.raw.error);
  }

  if (objectValue.raw?.isError === true || objectValue.raw?.result?.isError === true) {
    return valueToText(objectValue.raw);
  }

  if (objectValue.parsedText) {
    const parsedTextError = explicitErrorMessage(objectValue.parsedText);
    if (parsedTextError) return parsedTextError;
  }

  if (typeof objectValue.text === "string") {
    const textError = explicitErrorMessage(objectValue.text);
    if (textError) return textError;
  }

  return null;
}

function hasCreatedObjectEvidence(value: unknown) {
  for (const item of walk(value)) {
    if (!item || typeof item !== "object") continue;

    const objectValue = item as Record<string, any>;

    if (objectValue.id || objectValue.post_id || objectValue.postId) return true;
    if (objectValue.record_id || objectValue.recordId) return true;
    if (objectValue.url || objectValue.link || objectValue.permalink) return true;

    const status = String(objectValue.status ?? objectValue.lifecycleState ?? "").toLowerCase();

    if (["published", "completed", "success", "succeeded", "created"].includes(status)) {
      return true;
    }

    if (objectValue.success === true || objectValue.ok === true) return true;

    if (typeof objectValue.text === "string") {
      const parsedText = parseJsonMaybe(objectValue.text);
      if (parsedText && hasCreatedObjectEvidence(parsedText)) return true;
    }
  }

  return false;
}

function hasSuccessTextEvidence(value: unknown) {
  const text = valueToText(value).toLowerCase();

  return (
    text.includes('"status":"published"') ||
    text.includes('"lifecycleState":"PUBLISHED"'.toLowerCase()) ||
    text.includes("record created and published successfully") ||
    text.includes("record created successfully") ||
    text.includes("created and published successfully") ||
    text.includes("published successfully") ||
    text.includes("posted successfully") ||
    text.includes("record_id") ||
    text.includes("post id")
  );
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

  const hasSuccessEvidence = hasCreatedObjectEvidence(result) || hasSuccessTextEvidence(result);

  if (hasSuccessEvidence) {
    return true;
  }

  if (hasFollowUpOrPreview(result)) {
    throw new Error(`ZapierMCP asked for more information instead of confirming execution: ${valueToText(result).slice(0, 1000)}`);
  }

  if (requireSuccessEvidence) {
    throw new Error(
      `ZapierMCP response did not include clear create/publish confirmation, so VIP will not mark this asset published: ${valueToText(result).slice(0, 1000)}`
    );
  }

  return true;
}
