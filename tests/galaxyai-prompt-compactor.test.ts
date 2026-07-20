import assert from "node:assert/strict";
import test from "node:test";
import {
  MAGICA_PROMPT_SAFE_LIMIT,
  compactMagicaPrompt,
} from "../src/lib/galaxyai/prompt-compactor.ts";

test("keeps a prompt unchanged when it is already within the Magica limit", () => {
  const source = "Create a polished LinkedIn image for local business owners.";
  const result = compactMagicaPrompt(source);

  assert.equal(result.prompt, source);
  assert.equal(result.wasCompacted, false);
  assert.equal(result.originalLength, source.length);
  assert.equal(result.sentLength, source.length);
});

test("compacts an oversized prompt while retaining high-value creative direction", () => {
  const repeatedBoilerplate = Array.from(
    { length: 90 },
    (_, index) => `General background note ${index}: keep the design professional and polished.`,
  ).join("\n\n");

  const source = [
    "Create a LinkedIn feed image for the campaign: Better Local Visibility",
    "Platform format: Square 1200x1200.",
    "Campaign angle: Help owners understand why clear local visibility matters.",
    "Target audience: Local service-business owners.",
    "Featured service / offer: A practical marketing visibility review.",
    "CTA idea: Schedule a review.",
    "Post copy this image supports:\nCustomers cannot choose a business they cannot find.",
    "Creative direction:\nShow a confident local business owner reviewing a clean visibility dashboard. Use realistic lighting and one clear focal point.",
    repeatedBoilerplate,
    "Artifact control and quality requirements:\nAvoid malformed hands, fake metrics, unreadable text, warped logos, and clutter.",
    "Output requirement:\nProduce one polished social image.",
  ].join("\n\n");

  const result = compactMagicaPrompt(source);

  assert.equal(result.wasCompacted, true);
  assert.ok(result.prompt.length <= MAGICA_PROMPT_SAFE_LIMIT);
  assert.match(result.prompt, /Better Local Visibility/);
  assert.match(result.prompt, /Local service-business owners/);
  assert.match(result.prompt, /Schedule a review/);
  assert.match(result.prompt, /confident local business owner/);
  assert.match(result.prompt, /Avoid malformed hands/);
});

test("never exceeds a caller-provided limit", () => {
  const result = compactMagicaPrompt("Create an image.\n\n" + "detail ".repeat(1000), 500);

  assert.ok(result.prompt.length <= 500);
  assert.equal(result.limit, 500);
});
