import assert from "node:assert/strict";
import test from "node:test";
import {
  campaignStrategyValidationMessage,
  readStoredCampaignApprovalSignatures,
  validateCampaignStrategySignatures,
} from "../src/lib/ad-studio/campaign-strategy-validation.ts";

const base = {
  campaignSourceSignature: "campaign-current",
  combinedApprovalSignature: "combined-current",
  storedFoundationSignature: "foundation-current",
  currentFoundationSignature: "foundation-current",
  storedMarketIntelligenceSignature: "market-current",
  currentMarketIntelligenceSignature: "market-current",
};

test("accepts the combined approval signature used by newly created campaigns", () => {
  const result = validateCampaignStrategySignatures({
    ...base,
    gateSourceSignature: "combined-current",
  });

  assert.equal(result.valid, true);
  assert.equal(result.format, "combined_approval");
  assert.deepEqual(result.issues, []);
});

test("accepts campaign-input signatures when stored foundation and research snapshots remain current", () => {
  const result = validateCampaignStrategySignatures({
    ...base,
    gateSourceSignature: "campaign-current",
  });

  assert.equal(result.valid, true);
  assert.equal(result.format, "campaign_inputs");
  assert.deepEqual(result.issues, []);
});

test("rejects campaign-input signatures when the Strategy Foundation changed", () => {
  const result = validateCampaignStrategySignatures({
    ...base,
    gateSourceSignature: "campaign-current",
    currentFoundationSignature: "foundation-new",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.issues, ["strategy_foundation"]);
  assert.match(campaignStrategyValidationMessage(result), /Strategy Foundation changed/);
});

test("rejects campaign-input signatures when approved Market Intelligence changed", () => {
  const result = validateCampaignStrategySignatures({
    ...base,
    gateSourceSignature: "campaign-current",
    currentMarketIntelligenceSignature: "market-new",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.issues, ["market_intelligence"]);
  assert.match(campaignStrategyValidationMessage(result), /Market Intelligence changed/);
});

test("rejects stale campaign inputs before reporting snapshot differences", () => {
  const result = validateCampaignStrategySignatures({
    ...base,
    gateSourceSignature: "campaign-old",
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.includes("campaign_inputs"));
  assert.match(campaignStrategyValidationMessage(result), /Campaign inputs changed/);
});

test("reads approval signatures from both current and nested campaign strategy shapes", () => {
  assert.deepEqual(
    readStoredCampaignApprovalSignatures({
      strategyFoundation: { signature: "foundation-direct" },
      marketIntelligence: { signature: "market-direct" },
    }),
    {
      foundationSignature: "foundation-direct",
      marketIntelligenceSignature: "market-direct",
    },
  );

  assert.deepEqual(
    readStoredCampaignApprovalSignatures({
      oneOffCampaignStrategy: {
        strategyFoundation: { signature: "foundation-nested" },
        marketIntelligence: { signature: "market-nested" },
      },
    }),
    {
      foundationSignature: "foundation-nested",
      marketIntelligenceSignature: "market-nested",
    },
  );
});
