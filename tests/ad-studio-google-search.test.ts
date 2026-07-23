import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGoogleSearchVariants } from "../src/lib/ad-studio/google-search-generator.ts";

function rawVariant(index: number) {
  return {
    name: `Concept ${index}`,
    headlines: Array.from(
      { length: 12 },
      (_, item) => `Distinct search headline ${index}-${item} that is deliberately too long`,
    ),
    descriptions: Array.from(
      { length: 4 },
      (_, item) =>
        `Description ${index}-${item} explains the offer clearly and includes a practical next step without unsupported claims or unnecessary language.`,
    ),
    keywordThemes: Array.from(
      { length: 10 },
      (_, item) => `high intent keyword ${index}-${item}`,
    ),
    negativeKeywordThemes: Array.from(
      { length: 8 },
      (_, item) => `irrelevant intent ${index}-${item}`,
    ),
    pathOne: "service-that-is-too-long",
    pathTwo: "request-an-estimate-now",
    callouts: Array.from(
      { length: 6 },
      (_, item) => `Detailed callout benefit ${index}-${item}`,
    ),
    sitelinks: Array.from({ length: 4 }, (_, item) => ({
      text: `Detailed sitelink text ${index}-${item}`,
      descriptionOne: `First detailed description line ${index}-${item} that is long`,
      descriptionTwo: `Second detailed description line ${index}-${item} that is long`,
      destinationUrl: item === 0 ? "javascript:alert(1)" : "https://example.com/service#top",
    })),
  };
}

test("normalizes generated Google Search variants to platform-safe limits", () => {
  const variants = normalizeGoogleSearchVariants(
    { variants: [rawVariant(1), rawVariant(2), rawVariant(3)] },
    "https://example.com/landing",
  );

  assert.equal(variants.length, 3);
  for (const variant of variants) {
    assert.equal(variant.kind, "search");
    assert.ok(variant.headlines.length >= 8);
    assert.ok(variant.headlines.every((value) => value.length <= 30));
    assert.equal(variant.descriptions.length, 4);
    assert.ok(variant.descriptions.every((value) => value.length <= 90));
    assert.ok(variant.pathOne.length <= 15);
    assert.ok(variant.pathTwo.length <= 15);
    assert.ok(variant.callouts.every((value) => value.length <= 25));
    assert.equal(variant.sitelinks.length, 4);
    assert.ok(variant.sitelinks.every((item) => item.text.length <= 25));
    assert.ok(
      variant.sitelinks.every((item) => item.descriptionOne.length <= 35),
    );
    assert.ok(
      variant.sitelinks.every((item) => item.descriptionTwo.length <= 35),
    );
    assert.equal(
      variant.sitelinks[0].destinationUrl,
      "https://example.com/landing",
    );
    assert.equal(
      variant.sitelinks[1].destinationUrl,
      "https://example.com/service",
    );
  }
});

test("rejects incomplete Google Search packages before persistence", () => {
  assert.throws(
    () =>
      normalizeGoogleSearchVariants(
        {
          variants: [
            { ...rawVariant(1), headlines: ["Only one"] },
            rawVariant(2),
          ],
        },
        "https://example.com/landing",
      ),
    /at least 8 unique headlines/,
  );

  assert.throws(
    () =>
      normalizeGoogleSearchVariants(
        { variants: [rawVariant(1)] },
        "https://example.com/landing",
      ),
    /did not return enough variants/,
  );
});
