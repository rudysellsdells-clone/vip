import assert from "node:assert/strict";
import test from "node:test";
import { normalizePaidSocialVariants } from "../src/lib/ad-studio/paid-social-generator.ts";

function rawVariants() {
  return Array.from({ length: 4 }, (_, index) => ({
    name: `Concept ${index + 1}`,
    primaryText:
      `Primary social ad concept ${index + 1} opens with a distinct buyer situation and explains the approved offer clearly without unsupported claims. `.repeat(8),
    headline: `A distinct paid social headline for concept ${index + 1} that may be too long`,
    description: `A distinct supporting description for concept ${index + 1} that may be longer than the preferred platform display length.`,
    callToAction: index % 2 === 0 ? "Learn More" : "Get Quote",
    audienceFrame: `Audience frame ${index + 1} explains the decision moment and relevance.`,
    creativeBrief: `Show a realistic customer in a believable setting for concept ${index + 1}. Use one clear focal point, authentic expressions, brand-safe details, and no text overlays or invented proof.`,
  }));
}

test("normalizes LinkedIn variants to recommended display lengths", () => {
  const variants = normalizePaidSocialVariants({
    value: { variants: rawVariants() },
    platform: "linkedin",
  });

  assert.equal(variants.length, 4);
  assert.ok(variants.every((item) => item.kind === "paid_social"));
  assert.ok(variants.every((item) => item.platform === "linkedin"));
  assert.ok(variants.every((item) => item.primaryText.length <= 150));
  assert.ok(variants.every((item) => item.headline.length <= 70));
  assert.ok(variants.every((item) => item.description.length <= 100));
});

test("keeps Meta primary text mobile-friendly while preserving distinct concepts", () => {
  const variants = normalizePaidSocialVariants({
    value: { variants: rawVariants() },
    platform: "meta",
  });

  assert.equal(variants.length, 4);
  assert.ok(variants.every((item) => item.platform === "meta"));
  assert.ok(variants.every((item) => item.primaryText.length <= 500));
  assert.equal(new Set(variants.map((item) => item.primaryText)).size, 4);
});

test("rejects incomplete or duplicate paid-social output", () => {
  assert.throws(
    () =>
      normalizePaidSocialVariants({
        value: { variants: rawVariants().slice(0, 3) },
        platform: "meta",
      }),
    /four complete variants/,
  );

  const duplicates = rawVariants().map((item) => ({
    ...item,
    primaryText: "The same primary text for every concept.",
  }));
  assert.throws(
    () =>
      normalizePaidSocialVariants({
        value: { variants: duplicates },
        platform: "linkedin",
      }),
    /distinct primary text/,
  );
});
