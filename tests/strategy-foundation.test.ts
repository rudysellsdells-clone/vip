import assert from "node:assert/strict";
import test from "node:test";
import { buildApprovedStrategyFoundation } from "../src/lib/strategy/strategy-foundation.ts";

test("structured account strategy becomes the campaign-ready source of truth", () => {
  const foundation = buildApprovedStrategyFoundation({
    accountId: "account-123",
    generatedAt: "2026-07-22T12:00:00.000Z",
    account: {
      name: "Acme Services",
      website_url: "https://example.com",
      primary_cta: "Schedule service",
    },
    brandProfile: {
      company_name: "Acme Services",
      website_url: "https://example.com",
      primary_cta: "Schedule service",
      tone: "Practical, credible, and friendly",
      service_areas: "Madison, WI\nDane County, WI",
      brand_colors: ["#0B4A7A", "#F59E0B"],
    },
    cloneProfile: {
      business_summary: "A local service company focused on reliable outcomes.",
      voice_summary: "Helpful and direct.",
      sales_outcome_summary: "Customers gain a dependable long-term solution.",
    },
    brandRules: [
      { rule_text: "Use everyday language.", category: "voice", priority: 1 },
    ],
    serviceLines: [
      {
        id: "service-1",
        name: "Preventive Maintenance",
        shortName: "Maintenance",
        description: "Ongoing care that reduces avoidable breakdowns.",
        primaryOutcome: "Reliable performance with fewer surprises.",
      },
    ],
    audiences: [
      {
        id: "audience-1",
        name: "Busy property owners",
        description: "Owners who value dependable service and clear communication.",
        commonPains: ["Unexpected breakdowns"],
        desiredOutcomes: ["Predictable maintenance"],
        objections: ["Concern about ongoing cost"],
      },
    ],
    offers: [
      {
        id: "offer-1",
        serviceLineId: "service-1",
        name: "Annual Maintenance Plan",
        description: "Scheduled preventive care throughout the year.",
        offerType: "retainer",
        primaryCta: "Request a maintenance consultation",
        outcome: "Fewer emergency repairs",
        priceNotes: null,
        targetBuyerSegments: ["Busy property owners"],
      },
    ],
    knowledgeSources: [
      {
        id: "knowledge-1",
        title: "Service handbook",
        source_type: "document",
        summary: "Approved service details.",
        updated_at: "2026-07-20T12:00:00.000Z",
      },
    ],
    approvedExamples: [
      {
        id: "example-1",
        title: "Approved email",
        content_type: "email",
        source: "internal",
        updated_at: "2026-07-21T12:00:00.000Z",
      },
    ],
  });

  assert.equal(foundation.version, "1.0");
  assert.equal(foundation.accountName, "Acme Services");
  assert.equal(foundation.readiness.score, 100);
  assert.equal(foundation.readiness.campaignReady, true);
  assert.deepEqual(foundation.readiness.missing, []);
  assert.equal(foundation.campaignDefaults.targetAudience, "Busy property owners");
  assert.equal(foundation.campaignDefaults.primaryOffer, "Annual Maintenance Plan");
  assert.equal(
    foundation.campaignDefaults.callToAction,
    "Request a maintenance consultation",
  );
  assert.equal(foundation.sources.find((source) => source.key === "structured_market_strategy")?.count, 3);
});

test("legacy free-text fields remain available while missing structured strategy is reported", () => {
  const foundation = buildApprovedStrategyFoundation({
    accountId: "account-legacy",
    account: { name: "Legacy Brand" },
    brandProfile: {
      target_audience: "Local homeowners",
      core_offers: "Free project consultation",
      tone: "Warm and professional",
      primary_cta: "Call today",
      notes: "Known for responsive local service.",
    },
    cloneProfile: {
      business_summary: "A locally owned home-services business.",
    },
  });

  assert.equal(foundation.campaignDefaults.targetAudience, "Local homeowners");
  assert.equal(foundation.campaignDefaults.primaryOffer, "Free project consultation");
  assert.equal(foundation.campaignDefaults.tone, "Warm and professional");
  assert.equal(foundation.readiness.campaignReady, false);
  assert.ok(foundation.readiness.score > 0);
  assert.ok(foundation.readiness.missing.includes("At least one service line"));
  assert.ok(foundation.readiness.missing.includes("At least one audience"));
  assert.ok(foundation.readiness.missing.includes("At least one offer"));
});
