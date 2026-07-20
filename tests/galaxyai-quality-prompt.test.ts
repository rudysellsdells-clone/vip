import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMagicaImageExecutionPrompt,
  buildMagicaSharedExecutionPrompt,
  buildMagicaVideoExecutionPrompt,
} from "../src/lib/galaxyai/quality-prompt.ts";
import {
  MAGICA_PROMPT_SAFE_LIMIT,
  MAGICA_VIDEO_PROMPT_SAFE_LIMIT,
} from "../src/lib/galaxyai/prompt-compactor.ts";

const source = [
  "Create a polished campaign visual for local business owners.",
  "Campaign angle: Make better digital visibility feel practical and credible.",
  "Target audience: Local service-business owners.",
  "Creative direction: Show one confident owner in a clean professional setting.",
  "CTA: Schedule a visibility review.",
  "background detail ".repeat(500),
].join("\n\n");

test("builds a FLUX-safe image prompt with explicit artifact controls", () => {
  const result = buildMagicaImageExecutionPrompt(source);

  assert.ok(result.sentLength <= MAGICA_PROMPT_SAFE_LIMIT);
  assert.match(result.prompt, /IMAGE QUALITY STANDARD/);
  assert.match(result.prompt, /extra or fused limbs/);
  assert.match(result.prompt, /SOURCE CREATIVE BRIEF/);
});

test("builds a Seedance-safe 15-second motion prompt", () => {
  const result = buildMagicaVideoExecutionPrompt(source);

  assert.ok(result.sentLength <= MAGICA_VIDEO_PROMPT_SAFE_LIMIT);
  assert.match(result.prompt, /exactly 15 seconds/);
  assert.match(result.prompt, /No scene cuts/);
  assert.match(result.prompt, /SOURCE CREATIVE AND MOTION BRIEF/);
});

test("builds a shared prompt safe for the existing one-field workflow", () => {
  const result = buildMagicaSharedExecutionPrompt(source);

  assert.ok(result.sentLength <= MAGICA_VIDEO_PROMPT_SAFE_LIMIT);
  assert.match(result.prompt, /IMAGE \+ 15-SECOND VIDEO QUALITY STANDARD/);
  assert.match(result.prompt, /Do not invent brands/);
  assert.match(result.prompt, /No cuts, morphing/);
});
