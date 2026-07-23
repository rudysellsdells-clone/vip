import assert from "node:assert/strict";
import test from "node:test";
import { createAdPackageDraft } from "../src/lib/ad-studio/ad-package.ts";
import {
  buildAdPackageTrackedUrl,
  scoreAdPackage,
} from "../src/lib/ad-studio/ad-package-scoring.ts";

function draft() {
  return createAdPackageDraft({
    accountId: "account-1",
    campaignId: "campaign-1",
    campaignName: "Summer Service",
    channel: "google_search",
    objective: "Generate qualified estimate requests",
    audience: "Homeowners planning a major project",
    offer: "A documented consultation and estimate",
    destinationUrl: "https://example.com/estimate?ref=vip",
    strategy: {
      strategySignature: "strategy-signature",
      marketIntelligenceSignature: "market-signature",
      strategySnapshot: { approved: true },
      evidenceSourceIds: ["source-1"],
    },
    attributionCampaign: "summer-service",
    attributionContent: "google-search-package",
  });
}

function searchVariant(index: number) {
  return {
    kind: "search" as const,
    name: `Concept ${index}`,
    headlines: Array.from({ length: 10 }, (_, item) => `Headline ${index}-${item}`),
    descriptions: Array.from({ length: 4 }, (_, item) => `Description ${index}-${item}`),
    keywordThemes: Array.from({ length: 8 }, (_, item) => `keyword ${index}-${item}`),
    negativeKeywordThemes: Array.from({ length: 6 }, (_, item) => `negative ${index}-${item}`),
    pathOne: "estimate",
    pathTwo: "service",
    callouts: ["Clear Process", "Local Service", "Easy Next Step", "Helpful Team"],
    sitelinks: Array.from({ length: 4 }, (_, item) => ({
      text: `Sitelink ${item}`,
      descriptionOne: `Details ${item}`,
      descriptionTwo: `Learn more ${item}`,
      destinationUrl: `https://example.com/page-${item}`,
    })),
  };
}

test("scores a complete Search package as export ready", () => {
  const adPackage = {
    ...draft(),
    status: "needs_review" as const,
    variants: [searchVariant(1), searchVariant(2), searchVariant(3)],
  };
  const score = scoreAdPackage(adPackage);

  assert.ok(score.total >= 90);
  assert.equal(score.rating, "excellent");
  assert.equal(score.issues.length, 0);
});

test("builds a tracked destination without removing existing query parameters", () => {
  const tracked = new URL(buildAdPackageTrackedUrl(draft()));
  assert.equal(tracked.searchParams.get("ref"), "vip");
  assert.equal(tracked.searchParams.get("utm_source"), "google");
  assert.equal(tracked.searchParams.get("utm_medium"), "cpc");
  assert.equal(tracked.searchParams.get("utm_campaign"), "summer-service");
  assert.equal(tracked.searchParams.get("vip_campaign"), "campaign-1");
});

test("flags incomplete packages for work", () => {
  const adPackage = {
    ...draft(),
    strategy: {
      strategySignature: "",
      marketIntelligenceSignature: null,
      strategySnapshot: {},
      evidenceSourceIds: [],
    },
    attribution: {
      source: "",
      medium: "",
      campaign: "",
      content: "",
      term: null,
    },
    variants: [],
  };
  const score = scoreAdPackage(adPackage);
  assert.equal(score.rating, "needs_work");
  assert.ok(score.issues.length > 0);
});
