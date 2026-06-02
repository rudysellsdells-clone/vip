function valueToText(value: unknown) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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
      text.includes("is missing") ||
      text.includes("required field")
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

export function assertSuccessfulMcpResult(result: unknown) {
  if (!result || typeof result !== "object") {
    throw new Error("ZapierMCP did not return a valid result object.");
  }

  if (looksLikeError(result)) {
    throw new Error(`ZapierMCP did not confirm success: ${valueToText(result).slice(0, 1000)}`);
  }

  return true;
}
