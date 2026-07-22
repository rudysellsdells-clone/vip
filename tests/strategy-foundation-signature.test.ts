import assert from "node:assert/strict";
import test from "node:test";
import { buildApprovedStrategyFoundation } from "../src/lib/strategy/strategy-foundation.ts";
import {
  computeStrategyApprovalSourceSignature,
  computeStrategyFoundationSignature,
} from "../src/lib/strategy/strategy-foundation-signature.ts";

function foundation(overrides: Record<string, unknown> = {}) {
  return buildApprovedStrategyFoundation({
    accountId: "account-123",
    generatedAt: "2026-07-22T12:00:00.000Z",
    account: {
      name: "Acme Services",
      website_url: "https://example.com",
      primary_cta: "Schedule service",
    },
    brandProfile: {
      company_name: "Acme Services",
      tone: "Helpful and direct",
    },
    brandRules: [
      { rule_text: "Use everyday language.", category: "voice", priority: 1 },
    ],
    serviceLines: [
      {
        id: "service-1",
        name: "Maintenance",
        shortName: null,
        description: "Preventive service.",
        primaryOutcome: "Fewer surprises.",
      },
    ],
    audiences: [
      {
        id: "audience-1",
        name: "Property owners",
        description: "Owners seeking reliable service.",
        commonPains: ["Unexpected breakdowns"],
        desiredOutcomes: ["Predictable performance"],
        objections: ["Ongoing cost"],
      },
    ],
    offers: [
      {
        id: "offer-1",
        serviceLineId: "service-1",
        name: "Annual Plan",
        description: "Scheduled care.",
        offerType: "retainer",
        primaryCta: "Request a consultation",
        outcome: "Fewer emergency repairs",
        priceNotes: null,
        targetBuyerSegments: ["Property owners"],
      },
    ],
    ...overrides,
  });
}

test("foundation signature ignores generated timestamps", () => {
  const first = foundation();
  const second = foundation({ generatedAt: "2026-07-23T12:00:00.000Z" });

  assert.equal(
    computeStrategyFoundationSignature(first),
    computeStrategyFoundationSignature(second),
  );
});

test("foundation signature changes when approved strategy truth changes", () => {
  const first = foundation();
  const second = foundation({
    audiences: [
      {
        id: "audience-1",
        name: "Commercial property managers",
        description: "Managers responsible for multiple locations.",
        commonPains: ["Portfolio-wide inconsistency"],
        desiredOutcomes: ["Standardized maintenance"],
        objections: ["Vendor transition risk"],
      },
    ],
  });

  assert.notEqual(
    computeStrategyFoundationSignature(first),
    computeStrategyFoundationSignature(second),
  );
});

test("approval signature changes for campaign or foundation edits", () => {
  const foundationSignature = computeStrategyFoundationSignature(foundation());
  const baseline = computeStrategyApprovalSourceSignature({
    campaignSourceSignature: "campaign-a",
    foundationSignature,
  });
  const changedCampaign = computeStrategyApprovalSourceSignature({
    campaignSourceSignature: "campaign-b",
    foundationSignature,
  });
  const changedFoundation = computeStrategyApprovalSourceSignature({
    campaignSourceSignature: "campaign-a",
    foundationSignature: computeStrategyFoundationSignature(
      foundation({
        brandRules: [
          { rule_text: "Avoid jargon.", category: "voice", priority: 1 },
        ],
      }),
    ),
  });

  assert.notEqual(baseline, changedCampaign);
  assert.notEqual(baseline, changedFoundation);
});
