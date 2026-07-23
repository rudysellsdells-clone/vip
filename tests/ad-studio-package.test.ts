import assert from "node:assert/strict";
import test from "node:test";
import {
  AD_CHANNEL_DEFINITIONS,
  createAdPackageDraft,
  getAdPackageGenerationReadiness,
  resolveAdChannelDefinition,
} from "../src/lib/ad-studio/ad-package.ts";

const strategy = {
  strategySignature: "strategy-signature-123",
  marketIntelligenceSignature: "market-signature-456",
  strategySnapshot: { objective: "Generate qualified estimates" },
  evidenceSourceIds: ["source-1", "source-1", "source-2"],
};

test("advertising channels map to existing asset and UTM contracts", () => {
  assert.deepEqual(AD_CHANNEL_DEFINITIONS.google_search, {
    channel: "google_search",
    label: "Google Search",
    assetType: "search_ad",
    utmSource: "google",
    utmMedium: "cpc",
    packageKind: "search",
  });
  assert.equal(AD_CHANNEL_DEFINITIONS.meta.assetType, "facebook_post");
  assert.equal(AD_CHANNEL_DEFINITIONS.meta.utmMedium, "paid-social");
  assert.equal(AD_CHANNEL_DEFINITIONS.linkedin.assetType, "linkedin_post");
});

test("draft packages retain campaign, strategy, evidence, destination, and attribution context", () => {
  const draft = createAdPackageDraft({
    accountId: "account-123",
    campaignId: "campaign-123",
    campaignName: "Fall Roofing Leads",
    channel: "google_search",
    objective: "Generate qualified roofing estimate requests",
    audience: "Homeowners with aging roofs",
    offer: "Free roof inspection",
    destinationUrl: "https://example.com/roofing#form",
    strategy,
    attributionCampaign: "fall-roofing-leads",
  });

  assert.equal(draft.title, "Fall Roofing Leads — Google Search");
  assert.equal(draft.status, "draft");
  assert.equal(draft.assetType, "search_ad");
  assert.equal(draft.packageKind, "search");
  assert.equal(draft.destinationUrl, "https://example.com/roofing");
  assert.equal(draft.attribution.source, "google");
  assert.equal(draft.attribution.medium, "cpc");
  assert.equal(draft.attribution.content, "google_search-package");
  assert.deepEqual(draft.strategy.evidenceSourceIds, ["source-1", "source-2"]);
  assert.deepEqual(draft.variants, []);
});

test("paid social packages use platform-specific existing asset types", () => {
  const meta = createAdPackageDraft({
    accountId: "account-123",
    campaignId: "campaign-123",
    campaignName: "Spring Service",
    channel: "meta",
    objective: "Generate bookings",
    audience: "Local homeowners",
    offer: "Spring service package",
    destinationUrl: "https://example.com/book",
    strategy,
    attributionCampaign: "spring-service",
    attributionContent: "homeowner-benefit-angle",
  });

  assert.equal(meta.assetType, "facebook_post");
  assert.equal(meta.packageKind, "paid_social");
  assert.equal(meta.attribution.source, "facebook");
  assert.equal(meta.attribution.medium, "paid-social");
  assert.equal(meta.attribution.content, "homeowner-benefit-angle");
});

test("invalid channels and destinations are rejected before generation", () => {
  assert.throws(
    () => resolveAdChannelDefinition("tiktok"),
    /Unsupported advertising channel/,
  );
  assert.throws(
    () =>
      createAdPackageDraft({
        accountId: "account-123",
        campaignId: "campaign-123",
        campaignName: "Invalid URL",
        channel: "linkedin",
        objective: "Generate leads",
        audience: "Operations leaders",
        offer: "Assessment",
        destinationUrl: "javascript:alert(1)",
        strategy,
        attributionCampaign: "invalid-url",
      }),
    /must use http or https/,
  );
});

test("generation readiness reports every missing prerequisite", () => {
  const readiness = getAdPackageGenerationReadiness({
    objective: "",
    audience: "",
    offer: "",
    destinationUrl: "",
    strategy: {
      strategySignature: "",
      marketIntelligenceSignature: null,
      strategySnapshot: {},
      evidenceSourceIds: [],
    },
    attribution: {
      source: "google",
      medium: "cpc",
      campaign: "",
      content: "variant-a",
      term: null,
    },
  });

  assert.equal(readiness.ready, false);
  assert.deepEqual(readiness.issues, [
    "Campaign objective is missing.",
    "Approved audience is missing.",
    "Selected offer is missing.",
    "Destination URL is missing.",
    "Approved Marketing Spine signature is missing.",
    "Attribution campaign name is missing.",
  ]);
});
