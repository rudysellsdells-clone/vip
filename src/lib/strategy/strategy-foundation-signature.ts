import { createHash } from "node:crypto";
import type { StrategyFoundation } from "./strategy-foundation";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }

  return value;
}

function sha256(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

export function strategyFoundationSignaturePayload(
  foundation: StrategyFoundation,
) {
  return {
    version: foundation.version,
    accountId: foundation.accountId,
    businessTruth: foundation.businessTruth,
    brandExpression: foundation.brandExpression,
    market: foundation.market,
    evidence: foundation.evidence,
    campaignDefaults: foundation.campaignDefaults,
  };
}

export function computeStrategyFoundationSignature(
  foundation: StrategyFoundation,
) {
  return sha256(strategyFoundationSignaturePayload(foundation));
}

export function computeStrategyApprovalSourceSignature({
  campaignSourceSignature,
  foundationSignature,
  marketIntelligenceSignature,
}: {
  campaignSourceSignature: string;
  foundationSignature: string;
  marketIntelligenceSignature?: string | null;
}) {
  return sha256({
    campaignSourceSignature,
    foundationSignature,
    ...(marketIntelligenceSignature
      ? { marketIntelligenceSignature }
      : {}),
  });
}
