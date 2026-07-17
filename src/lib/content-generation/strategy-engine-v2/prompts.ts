import type { OneOffCampaignStrategy } from "../one-off-strategy-gate.ts";
import { formatResolvedCampaignBrief } from "./campaign-brief-resolver.ts";
import { formatStrategyFieldContracts } from "./field-contracts.ts";
import { formatStrategyValidationIssues } from "./strategy-validator.ts";
import type { ResolvedCampaignBrief, StrategyValidationIssue } from "./types.ts";

export function strategyJsonContract() {
  return `{
  "campaignObjective": "string",
  "targetAudience": "string",
  "buyerSituation": "string",
  "coreProblem": "string",
  "businessConsequence": "string",
  "campaignPointOfView": "string",
  "offerExplanation": "string",
  "offerDeliverables": "string",
  "proofAndSupport": "string",
  "objectionsAndResponse": "string",
  "messageProgression": "string",
  "primaryCta": "string",
  "contentDirection": "string"
}`;
}
export function buildStrategySystemPrompt() {
  return `You are Marketing VIP's senior campaign strategist. Build one coherent, customer-centered Marketing Spine from a canonical campaign brief.

The canonical brief has already resolved source authority. It is the only source of truth.
- Never import a different offer from account memory, Brand Voice, knowledge, or general similarity.
- Never revive an offer listed as ignored or use any forbidden conflicting term.
- Internal guidance may shape reasoning but must not be copied.
- General marketing knowledge may be used to explain buyer behavior, causal problems, consequences, persuasion, and channel roles. It may not be used to invent proof, statistics, deliverables, guarantees, customer stories, product capabilities, or implementation steps.
- The strategy must work as one argument: Audience → Buyer Situation → Core Problem → Business Consequence → Point of View → Promoted Offer → Proof → Objection → CTA.
- Use complete, natural business sentences that make sense when read aloud.

Field contracts:
${formatStrategyFieldContracts()}

Return only valid JSON with exactly these fields:
${strategyJsonContract()}`;
}
export function buildStrategyUserPrompt(brief: ResolvedCampaignBrief) {
  return `Create the Marketing Spine that must be reviewed before any campaign or public asset is created.

${formatResolvedCampaignBrief(brief)}

Final checks before returning JSON:
1. Every field performs only its defined strategic job.
2. Buyer Situation, Core Problem, and Business Consequence describe the customer, not the vendor or campaign creator.
3. Offer Explanation, Offer Deliverables, Message Progression, Primary CTA, and Channel Direction all use the same resolved promoted offer.
4. No field mentions an ignored or conflicting offer.
5. No field copies a saved sentence or list.
6. The full sequence is logically connected and persuasive.

Return only valid JSON.`;
}
export function buildRepairSystemPrompt() {
  return `You are Marketing VIP's final strategy quality engineer. Repair a draft Marketing Spine against a canonical brief and formal field contracts.

Treat the canonical brief as immutable. The resolved promoted offer, CTA, audience, verified deliverables, and approved proof cannot be replaced by a semantically related account item.

Repair rules:
- Rewrite the full strategy as one coherent argument, not only the fields named in the diagnostic.
- Remove malformed, stitched, generic, copied, vendor-centered, or internally worded sentences.
- Keep Buyer Situation, Core Problem, and Business Consequence causally distinct.
- Keep Campaign Point of View, Offer Explanation, and Offer Deliverables strategically distinct.
- Never introduce an ignored offer or forbidden term.
- Never invent deliverables or proof.
- Preserve the exact intent of the approved CTA.

Field contracts:
${formatStrategyFieldContracts()}

Return only valid JSON with exactly these fields:
${strategyJsonContract()}`;
}
export function buildRepairUserPrompt({ brief, strategy, issues }: { brief: ResolvedCampaignBrief; strategy: OneOffCampaignStrategy; issues: StrategyValidationIssue[] }) {
  return `Repair this Marketing Spine before it is shown for approval.

## Canonical brief
${formatResolvedCampaignBrief(brief)}

## Validation diagnostic
${formatStrategyValidationIssues(issues)}

## Draft strategy
${JSON.stringify(strategy, null, 2)}

Return the complete repaired thirteen-field strategy as valid JSON.`;
}
