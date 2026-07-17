import type { OneOffCampaignStrategy } from "../one-off-strategy-gate.ts";
import type {
  ResolvedCampaignBrief,
  StrategyValidationIssue,
} from "./types.ts";

export const SAFE_NO_PROOF_STATEMENT =
  "No approved campaign-specific case study, testimonial, or quantitative performance evidence was supplied. Support the strategy with verified offer facts and clear reasoning, and avoid guarantees or unsupported results claims.";

/**
 * Deterministic release normalization is intentionally narrow. It may make a
 * field safer and more truthful, but it must never manufacture customer
 * insight, positioning, proof, deliverables, or product capabilities.
 */
export function normalizeStrategyForFinalRelease({
  strategy,
  brief,
}: {
  strategy: OneOffCampaignStrategy;
  brief: ResolvedCampaignBrief;
}): OneOffCampaignStrategy {
  if (brief.approvedProof.length) return strategy;

  return {
    ...strategy,
    proofAndSupport: SAFE_NO_PROOF_STATEMENT,
  };
}

const HARD_RELEASE_CODES = new Set([
  "missing_field",
  "malformed_language",
  "generic_fallback_template",
  "internal_language_leak",
  "source_regurgitation",
  "audience_not_one_decision_maker",
  "offer_explanation_not_resolved_offer",
  "invented_deliverable",
  "unsupported_proof",
  "cta_drift",
]);

/**
 * After the independent editorial reviewer approves the complete strategy,
 * deterministic rules retain authority over objective integrity and safety.
 * Marker-based marketing judgments remain visible as advisories rather than
 * repeatedly vetoing otherwise approved copy.
 */
export function finalReleaseBlockingIssues(
  issues: StrategyValidationIssue[],
) {
  return issues.filter(
    (issue) =>
      issue.field === "offerAuthority" ||
      HARD_RELEASE_CODES.has(issue.code) ||
      issue.code.startsWith("ignored_offer_reintroduced_"),
  );
}

export function finalReleaseAdvisoryIssues(
  issues: StrategyValidationIssue[],
) {
  const blocking = new Set(finalReleaseBlockingIssues(issues));
  return issues.filter((issue) => !blocking.has(issue));
}
