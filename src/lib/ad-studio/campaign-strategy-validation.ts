export type CampaignStrategySignatureFormat =
  | "campaign_inputs"
  | "combined_approval"
  | "invalid";

export type CampaignStrategySignatureValidation = {
  valid: boolean;
  format: CampaignStrategySignatureFormat;
  issues: Array<"campaign_inputs" | "strategy_foundation" | "market_intelligence">;
};

type SignatureInput = {
  gateSourceSignature: string | null | undefined;
  campaignSourceSignature: string;
  combinedApprovalSignature: string;
  storedFoundationSignature: string | null;
  currentFoundationSignature: string;
  storedMarketIntelligenceSignature: string | null;
  currentMarketIntelligenceSignature: string | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function cleanSignature(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nestedSignature(value: unknown) {
  return cleanSignature(record(value).signature);
}

export function readStoredCampaignApprovalSignatures(strategy: unknown) {
  const root = record(strategy);
  const nested = record(root.oneOffCampaignStrategy);

  return {
    foundationSignature:
      nestedSignature(root.strategyFoundation) ??
      nestedSignature(nested.strategyFoundation),
    marketIntelligenceSignature:
      nestedSignature(root.marketIntelligence) ??
      nestedSignature(nested.marketIntelligence),
  };
}

export function validateCampaignStrategySignatures({
  gateSourceSignature,
  campaignSourceSignature,
  combinedApprovalSignature,
  storedFoundationSignature,
  currentFoundationSignature,
  storedMarketIntelligenceSignature,
  currentMarketIntelligenceSignature,
}: SignatureInput): CampaignStrategySignatureValidation {
  const gateSignature = cleanSignature(gateSourceSignature);

  if (gateSignature === combinedApprovalSignature) {
    return {
      valid: true,
      format: "combined_approval",
      issues: [],
    };
  }

  const issues: CampaignStrategySignatureValidation["issues"] = [];

  if (gateSignature !== campaignSourceSignature) {
    issues.push("campaign_inputs");
  }

  if (storedFoundationSignature !== currentFoundationSignature) {
    issues.push("strategy_foundation");
  }

  if (
    storedMarketIntelligenceSignature !== currentMarketIntelligenceSignature
  ) {
    issues.push("market_intelligence");
  }

  return {
    valid: issues.length === 0,
    format: issues.length ? "invalid" : "campaign_inputs",
    issues,
  };
}

export function campaignStrategyValidationMessage(
  validation: CampaignStrategySignatureValidation,
) {
  if (validation.valid) return "";

  if (validation.issues.includes("campaign_inputs")) {
    return "Campaign inputs changed after the Marketing Spine was approved. Regenerate and approve the Marketing Spine before creating ads.";
  }

  if (validation.issues.includes("strategy_foundation")) {
    return "The approved Strategy Foundation changed after this campaign Marketing Spine was approved. Regenerate and approve the Marketing Spine before creating ads.";
  }

  return "Approved Market Intelligence changed after this campaign Marketing Spine was approved. Regenerate and approve the Marketing Spine before creating ads.";
}
