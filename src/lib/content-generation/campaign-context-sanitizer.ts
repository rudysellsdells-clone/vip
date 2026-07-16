const MIRRORED_STRATEGY_LABELS = [
  "Originality angle",
  "Objections to address",
  "Differentiator",
  "Proof points",
] as const;

const GENERATED_NOTES_MARKERS = [
  "Strategy context selected from Settings / Brand Voice:",
  "Knowledge and source context:",
] as const;

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForComparison(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isMirroredStrategyBlock(block: string) {
  return MIRRORED_STRATEGY_LABELS.some((label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped}:\\s*(?:\\n|$)`, "i").test(block.trim());
  });
}

function dedupeBlocks(blocks: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const rawBlock of blocks) {
    const block = cleanText(rawBlock);
    const key = normalizeForComparison(block);

    if (!block || seen.has(key)) continue;

    seen.add(key);
    output.push(block);
  }

  return output;
}

/**
 * Removes hidden form snapshots that were previously appended on every
 * keystroke. Explicit campaign fields already carry these values, so the
 * mirrored blocks add no information and can safely be omitted.
 */
export function sanitizeCampaignStrategyContext(value: unknown) {
  const text = cleanText(value);

  if (!text) return "";

  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !isMirroredStrategyBlock(block));

  return dedupeBlocks(blocks).join("\n\n");
}

/**
 * Campaign notes created by the one-off form historically repeated every
 * explicit strategy field and then embedded the hidden strategy/source
 * context again. The generator already receives those values separately.
 * This returns only the user's actual notes/service-line preface.
 */
export function sanitizeCampaignNotesForPrompt(value: unknown) {
  let text = cleanText(value);

  if (!text) return "";

  const markerIndexes = GENERATED_NOTES_MARKERS
    .map((marker) => text.indexOf(`\n\n${marker}`))
    .filter((index) => index >= 0);

  if (markerIndexes.length) {
    text = text.slice(0, Math.min(...markerIndexes)).trim();
  }

  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !isMirroredStrategyBlock(block));

  return dedupeBlocks(blocks).join("\n\n");
}

export function sanitizeOneOffCampaignStrategy(
  value: Record<string, unknown> | null | undefined,
) {
  if (!value) return value ?? null;

  return {
    ...value,
    strategyContext: sanitizeCampaignStrategyContext(value.strategyContext),
  };
}
