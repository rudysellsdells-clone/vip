export function readableError(value: unknown, fallback = "Unexpected error.") {
  if (value instanceof Error) {
    return value.message || fallback;
  }

  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    const candidates = [
      objectValue.error,
      objectValue.message,
      objectValue.details,
      objectValue.detail,
      objectValue.hint,
      objectValue.code,
    ];

    const readableCandidates = candidates
      .map((candidate) => {
        if (!candidate) return "";

        if (typeof candidate === "string") return candidate;

        if (candidate instanceof Error) return candidate.message;

        if (Array.isArray(candidate)) {
          return candidate
            .map((item) => readableError(item, ""))
            .filter(Boolean)
            .join(" | ");
        }

        if (typeof candidate === "object") {
          try {
            return JSON.stringify(candidate, null, 2);
          } catch {
            return String(candidate);
          }
        }

        return String(candidate);
      })
      .filter(Boolean);

    if (readableCandidates.length) {
      return readableCandidates.join(" | ");
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value) || fallback;
}

export function compactReadableError(value: unknown, fallback = "Unexpected error.") {
  return readableError(value, fallback)
    .replace(/\s+/g, " ")
    .trim();
}
