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

function looksLikeError(value: unknown) {
  if (!value) return false;

  if (typeof value === "string") {
    const text = value.toLowerCase();

    return (
      text.includes('"error"') ||
      text.includes("error from app") ||
      text.includes("terminated") ||
      text.includes("failed") ||
      text.includes("not found") ||
      text.includes("not configured") ||
      text.includes("is missing") ||
      text.includes("required field") ||
      text.includes("invalid input") ||
      text.includes("unable to") ||
      text.includes("cannot ")
    );
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, any>;

    if (objectValue.error || objectValue.isError === true) return true;
    if (objectValue.result?.isError === true) return true;
    if (objectValue.parsedText?.error || objectValue.parsedText?.isError === true) return true;
    if (objectValue.raw?.error || objectValue.raw?.isError === true) return true;
    if (objectValue.raw?.result?.isError === true) return true;

    return looksLikeError(valueToText(value));
  }

  return false;
}

function hasCreatedObjectEvidence(value: unknown) {
  for (const item of walk(value)) {
    if (!item || typeof item !== "object") continue;

    const objectValue = item as Record<string, any>;

    if (objectValue.id || objectValue.post_id || objectValue.postId) return true;
    if (objectValue.url || objectValue.link || objectValue.permalink) return true;
    if (objectValue.status && !String(objectValue.status).toLowerCase().includes("error")) return true;
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
    text.includes("created") ||
    text.includes("posted") ||
    text.includes("published") ||
    text.includes("success") ||
    text.includes("successfully") ||
    text.includes("record id") ||
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

  if (looksLikeError(result)) {
    throw new Error(`ZapierMCP returned an error-like response: ${valueToText(result).slice(0, 1000)}`);
  }

  if (hasFollowUpOrPreview(result)) {
    throw new Error(`ZapierMCP asked for more information instead of confirming execution: ${valueToText(result).slice(0, 1000)}`);
  }

  if (requireSuccessEvidence && !hasCreatedObjectEvidence(result) && !hasSuccessTextEvidence(result)) {
    throw new Error(
      `ZapierMCP response did not include clear create/publish confirmation, so VIP will not mark this asset published: ${valueToText(result).slice(0, 1000)}`
    );
  }

  return true;
}
