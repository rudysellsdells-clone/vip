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
  const payload = stableValue(strategyFoundationSignaturePayload(foundation));

  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}
