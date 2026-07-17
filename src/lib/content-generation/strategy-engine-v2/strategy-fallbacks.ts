import type { OneOffCampaignStrategy } from "../one-off-strategy-gate.ts";
import { StrategyQualityGateError } from "./errors.ts";
import type {
  ResolvedCampaignBrief,
  StrategyValidationIssue,
} from "./types.ts";

/**
 * H1.9A intentionally disables user-visible narrative fallbacks.
 *
 * The previous implementation assembled polished-looking strategy prose from
 * source fragments. That could satisfy keyword validators while still producing
 * non-logical sentences. Strategy generation must now pass semantic planning,
 * deterministic validation, and an independent editorial review. When it does
 * not, the preview is blocked and the user can retry without losing inputs.
 */
function narrativeFallbackDisabled(): never {
  throw new StrategyQualityGateError({
    stage: "quality_review",
    message:
      "Marketing VIP did not produce a strategy that met the quality standard. No preview was created. Please retry the generation; the campaign inputs remain unchanged.",
  });
}

/** @deprecated H1.9A blocks low-quality previews instead of generating narrative fallback copy. */
export function buildDeterministicStrategy(
  _brief: ResolvedCampaignBrief,
): OneOffCampaignStrategy {
  return narrativeFallbackDisabled();
}

/** @deprecated H1.9A blocks low-quality previews instead of replacing fields with template prose. */
export function applyDeterministicStrategySafeguards({
  strategy: _strategy,
  brief: _brief,
  issues: _issues,
}: {
  strategy: OneOffCampaignStrategy;
  brief: ResolvedCampaignBrief;
  issues: StrategyValidationIssue[];
}): OneOffCampaignStrategy {
  return narrativeFallbackDisabled();
}
