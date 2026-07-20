import {
  compactMagicaPrompt,
  MAGICA_PROMPT_SAFE_LIMIT,
  MAGICA_VIDEO_PROMPT_SAFE_LIMIT,
  type CompactMagicaPromptResult,
} from "./prompt-compactor.ts";

function normalize(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function withQualityEnvelope(input: {
  sourcePrompt: unknown;
  envelope: string;
  sourceLabel: string;
  limit: number;
}): CompactMagicaPromptResult {
  const source = normalize(input.sourcePrompt);
  const envelope = normalize(input.envelope);
  const separator = `\n\n${input.sourceLabel}:\n`;
  const availableForSource = Math.max(
    240,
    input.limit - envelope.length - separator.length,
  );
  const compactedSource = compactMagicaPrompt(source, availableForSource);
  let prompt = `${envelope}${separator}${compactedSource.prompt}`.trim();

  if (prompt.length > input.limit) {
    const finalSourceLimit = Math.max(
      200,
      availableForSource - (prompt.length - input.limit),
    );
    const finalSource = compactMagicaPrompt(source, finalSourceLimit);
    prompt = `${envelope}${separator}${finalSource.prompt}`.trim();
  }

  if (prompt.length > input.limit) {
    prompt = prompt.slice(0, input.limit).trimEnd();
  }

  return {
    prompt,
    originalLength: source.length,
    sentLength: prompt.length,
    wasCompacted: prompt !== source,
    limit: input.limit,
  };
}

const IMAGE_QUALITY_ENVELOPE = [
  "IMAGE QUALITY STANDARD:",
  "Create one coherent, commercial-grade source image with a single clear focal idea and a simple, physically plausible scene.",
  "Use realistic anatomy, natural facial structure, correct hands and fingers, consistent perspective, clean object boundaries, believable lighting, matching shadows, and accurate reflections.",
  "Keep the composition uncluttered. Prefer one primary person or subject and only the objects needed to communicate the idea.",
  "Do not invent brands, logos, product features, awards, testimonials, statistics, analytics, interface data, or business claims.",
  "Do not render small decorative text. Only include exact short wording when the source brief explicitly requires it; otherwise leave text out.",
  "Reject extra or fused limbs, duplicated people or objects, warped faces, floating items, melted surfaces, impossible geometry, garbled text, fake dashboards, visual noise, and unrelated background details.",
  "The finished frame must look intentional, polished, realistic, and suitable for professional social publishing.",
].join("\n");

const VIDEO_QUALITY_ENVELOPE = [
  "15-SECOND IMAGE-TO-VIDEO QUALITY STANDARD:",
  "Animate the supplied source image for exactly 15 seconds.",
  "Preserve the original people, facial identity, anatomy, clothing, objects, layout, background, logos, and any intentional text. Do not add, remove, replace, or redesign scene elements.",
  "Use restrained, realistic motion only: a slow camera push or gentle parallax, subtle natural breathing or blinking when appropriate, and small environmentally plausible movement.",
  "Keep the subject stable and recognizable from beginning to end. Maintain consistent lighting, perspective, scale, edges, and object positions.",
  "No scene cuts, sudden camera moves, morphing, melting, stretching, duplicated limbs or faces, new objects, flicker, jitter, texture crawling, changing text, changing logos, impossible reflections, or background hallucinations.",
  "Finish with a clean, stable hold that remains visually consistent with the source image.",
].join("\n");

const SHARED_QUALITY_ENVELOPE = [
  "IMAGE + 15-SECOND VIDEO QUALITY STANDARD:",
  "First create one coherent, commercial-grade source frame with one clear focal subject, realistic anatomy, correct hands, natural facial structure, consistent perspective, believable lighting and shadows, clean edges, and an uncluttered background.",
  "Do not invent brands, logos, awards, testimonials, statistics, dashboards, interface data, product features, or business claims. Avoid small rendered text unless exact short wording is explicitly required.",
  "Reject extra or fused limbs, duplicated people or objects, warped faces, floating items, melted surfaces, impossible geometry, garbled text, fake UI, visual noise, and unrelated details.",
  "Then animate that exact image for exactly 15 seconds. Preserve every person, face, body proportion, item, logo, intentional text, layout, background, and visual style.",
  "Use only subtle realistic motion such as a slow push-in, gentle parallax, natural blinking or breathing, and small plausible environmental movement.",
  "No cuts, morphing, melting, stretching, flicker, jitter, texture crawling, new objects, changing text, changing logos, camera jumps, or background hallucinations. End on a stable clean hold.",
].join("\n");

export function buildMagicaImageExecutionPrompt(
  sourcePrompt: unknown,
): CompactMagicaPromptResult {
  return withQualityEnvelope({
    sourcePrompt,
    envelope: IMAGE_QUALITY_ENVELOPE,
    sourceLabel: "SOURCE CREATIVE BRIEF",
    limit: MAGICA_PROMPT_SAFE_LIMIT,
  });
}

export function buildMagicaVideoExecutionPrompt(
  sourcePrompt: unknown,
): CompactMagicaPromptResult {
  return withQualityEnvelope({
    sourcePrompt,
    envelope: VIDEO_QUALITY_ENVELOPE,
    sourceLabel: "SOURCE CREATIVE AND MOTION BRIEF",
    limit: MAGICA_VIDEO_PROMPT_SAFE_LIMIT,
  });
}

export function buildMagicaSharedExecutionPrompt(
  sourcePrompt: unknown,
): CompactMagicaPromptResult {
  return withQualityEnvelope({
    sourcePrompt,
    envelope: SHARED_QUALITY_ENVELOPE,
    sourceLabel: "SOURCE CAMPAIGN BRIEF",
    limit: MAGICA_VIDEO_PROMPT_SAFE_LIMIT,
  });
}
