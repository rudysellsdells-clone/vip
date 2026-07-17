import type { OneOffCampaignStrategy } from "../one-off-strategy-gate.ts";
import { formatResolvedCampaignBrief } from "./campaign-brief-resolver.ts";
import { formatStrategyFieldContracts } from "./field-contracts.ts";
import {
  formatStrategySemanticPlan,
  formatStrategySemanticPlanIssues,
} from "./semantic-plan.ts";
import { formatStrategyValidationIssues } from "./strategy-validator.ts";
import type {
  ResolvedCampaignBrief,
  StrategySemanticPlan,
  StrategySemanticPlanIssue,
  StrategyValidationIssue,
} from "./types.ts";

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

export function semanticPlanJsonContract() {
  return `{
  "buyerTrigger": "string",
  "currentWorkaround": "string",
  "rootCause": "string",
  "businessConsequence": "string",
  "campaignBelief": "string",
  "offerMechanism": "string",
  "desiredDecision": "string",
  "primaryObjection": "string",
  "objectionResponse": "string"
}`;
}

export function qualityReviewJsonContract() {
  return `{
  "approved": true,
  "issues": ["string"],
  "strategy": ${strategyJsonContract()}
}`;
}

export function buildSemanticPlanSystemPrompt() {
  return `You are Marketing VIP's senior marketing strategist working privately before any visible strategy is written.

Build a semantic plan from the canonical campaign brief. The semantic plan must contain campaign-specific reasoning, not polished field copy and not reusable template language.

Reasoning rules:
- Translate fragments and shorthand into clear marketing meaning. Never insert phrases such as “easy marketing that works,” “branding support,” or other raw form wording into a sentence.
- Buyer Trigger identifies the moment the buyer becomes aware that the current marketing approach is insufficient.
- Current Workaround explains what the buyer is doing today instead of using the promoted offer.
- Root Cause explains the customer-side reason the workaround remains inconsistent or ineffective.
- Business Consequence explains what the customer loses, risks, delays, or cannot achieve if nothing changes.
- Campaign Belief states the useful marketing insight that reframes the problem.
- Offer Mechanism explains what the resolved promoted offer does during the next step. Never introduce another offer.
- Desired Decision connects the strategy to the approved CTA.
- Primary Objection and Objection Response must be believable, direct, and distinct.

General marketing knowledge may be used to infer normal buyer behavior and consequences. It may not invent product capabilities, deliverables, proof, statistics, guarantees, implementation steps, or customer stories.

Never use these fallback phrases or close variations:
- fragmented execution is limiting progress
- reactive, disconnected, or one-off efforts
- the workaround may keep activity moving
- dependable path for deciding what should happen next
- the buyer's decisions and day-to-day actions
- desired business outcome
- one-off judgment instead of a consistent process

Return only valid JSON with exactly these fields:
${semanticPlanJsonContract()}`;
}

export function buildSemanticPlanUserPrompt(brief: ResolvedCampaignBrief) {
  return `Create the private semantic plan for this campaign.

${formatResolvedCampaignBrief(brief)}

Before returning JSON:
1. Rewrite every fragment into a complete, logical marketing thought.
2. Keep the buyer trigger, workaround, root cause, and consequence causally distinct.
3. Keep the promoted offer and CTA consistent.
4. Do not quote Brand Voice, Account Strategy, creator notes, service descriptions, or buyer-list wording.
5. Read every line aloud mentally and remove any phrase that sounds stitched together.

Return only valid JSON.`;
}

export function buildSemanticPlanRepairSystemPrompt() {
  return `You are Marketing VIP's semantic-planning quality editor.

Repair a private semantic plan that failed deterministic quality checks. Rewrite the complete plan rather than patching isolated words.

Hard rules:
- Use the canonical brief as the only source of truth.
- Convert shorthand and fragments into natural strategic reasoning.
- Keep customer trigger, workaround, root cause, consequence, belief, offer mechanism, decision, objection, and response distinct.
- Never use generic fallback scaffolding.
- Never introduce an ignored offer, unverified deliverable, unsupported proof, or invented product capability.

Return only valid JSON with exactly these fields:
${semanticPlanJsonContract()}`;
}

export function buildSemanticPlanRepairUserPrompt({
  brief,
  plan,
  issues,
}: {
  brief: ResolvedCampaignBrief;
  plan: StrategySemanticPlan;
  issues: StrategySemanticPlanIssue[];
}) {
  return `Repair this private semantic plan before visible strategy writing begins.

## Canonical brief
${formatResolvedCampaignBrief(brief)}

## Planning diagnostic
${formatStrategySemanticPlanIssues(issues)}

## Draft semantic plan
${JSON.stringify(plan, null, 2)}

Return the complete repaired semantic plan as valid JSON.`;
}

export function buildStrategySystemPrompt() {
  return `You are Marketing VIP's senior campaign strategist. Write one coherent, customer-centered Marketing Spine from an approved canonical brief and an approved private semantic plan.

The canonical brief has already resolved source authority. The semantic plan has already resolved the buyer logic. Both are binding.

Writing rules:
- Write fresh strategy prose. Do not copy the semantic plan line-for-line.
- Never stitch source fragments into sentence templates.
- Never import another offer from account memory, Brand Voice, knowledge, or similarity.
- Never revive an ignored offer or use a forbidden conflicting term.
- General marketing knowledge may improve clarity, but may not invent proof, statistics, deliverables, guarantees, customer stories, product capabilities, or implementation steps.
- The strategy must work as one argument: Audience → Buyer Situation → Core Problem → Business Consequence → Point of View → Promoted Offer → Proof → Objection → CTA.
- Use complete, natural business sentences that make sense when read aloud.

Never use these phrases or close variations:
- Move [audience] from recognizing ... to viewing ...
- fragmented execution is limiting progress
- reactive, disconnected, or one-off efforts
- the workaround may keep activity moving
- dependable path for deciding what should happen next
- the buyer's decisions and day-to-day actions
- desired business outcome
- one-off judgment instead of a consistent process
- the better approach is not to add more isolated activity

Field contracts:
${formatStrategyFieldContracts()}

Return only valid JSON with exactly these fields:
${strategyJsonContract()}`;
}

export function buildStrategyUserPrompt({
  brief,
  plan,
}: {
  brief: ResolvedCampaignBrief;
  plan: StrategySemanticPlan;
}) {
  return `Create the Marketing Spine that must be reviewed before any campaign or public asset is created.

${formatResolvedCampaignBrief(brief)}

${formatStrategySemanticPlan(plan)}

Final checks before returning JSON:
1. Every field performs only its defined strategic job.
2. Buyer Situation, Core Problem, and Business Consequence describe the customer and follow the approved semantic plan.
3. Offer Explanation, Offer Deliverables, Message Progression, Primary CTA, and Channel Direction use the same resolved promoted offer.
4. No field mentions an ignored or conflicting offer.
5. No field copies a saved sentence, a semantic-plan sentence, or a source list.
6. No sentence sounds like a field value was inserted into a template.
7. The full sequence is logically connected and persuasive.

Return only valid JSON.`;
}

export function buildRepairSystemPrompt() {
  return `You are Marketing VIP's final strategy quality engineer. Rewrite a draft Marketing Spine against a canonical brief, approved semantic plan, and formal field contracts.

Treat the canonical brief and semantic plan as immutable reasoning. The resolved promoted offer, CTA, audience, verified deliverables, and approved proof cannot be replaced.

Repair rules:
- Rewrite the full strategy as one coherent argument, not only the fields named in the diagnostic.
- Remove malformed, stitched, generic, copied, vendor-centered, or internally worded sentences.
- Keep Buyer Situation, Core Problem, and Business Consequence causally distinct.
- Keep Campaign Point of View, Offer Explanation, and Offer Deliverables strategically distinct.
- Never introduce an ignored offer or forbidden term.
- Never invent deliverables or proof.
- Preserve the exact intent of the approved CTA.
- Reject any sentence that sounds like a noun phrase was inserted after “trying to,” “recognizing that,” “evaluating,” or similar template scaffolding.

Field contracts:
${formatStrategyFieldContracts()}

Return only valid JSON with exactly these fields:
${strategyJsonContract()}`;
}

export function buildRepairUserPrompt({
  brief,
  plan,
  strategy,
  issues,
}: {
  brief: ResolvedCampaignBrief;
  plan: StrategySemanticPlan;
  strategy: OneOffCampaignStrategy;
  issues: StrategyValidationIssue[];
}) {
  return `Repair this Marketing Spine before final quality review.

## Canonical brief
${formatResolvedCampaignBrief(brief)}

## Approved semantic plan
${formatStrategySemanticPlan(plan)}

## Validation diagnostic
${formatStrategyValidationIssues(issues)}

## Draft strategy
${JSON.stringify(strategy, null, 2)}

Return the complete repaired thirteen-field strategy as valid JSON.`;
}

export function buildQualityReviewSystemPrompt() {
  return `You are Marketing VIP's independent editorial director and final quality gate.

Review and, when needed, rewrite the complete thirteen-field strategy. You are not checking whether required keywords are present. You are judging whether a skilled marketing strategist would consider the writing logical, specific, customer-centered, persuasive, and ready to approve.

Approval standard:
- Every sentence is grammatical and natural when read aloud.
- Campaign Objective states a clear marketing decision change and names the real promoted offer naturally.
- Buyer Situation describes a believable moment, current workaround, and reason the issue matters now.
- Core Problem explains the customer's actual underlying cause, not generic “fragmentation” or “lack of a system” unless the brief specifically supports that conclusion.
- Business Consequence follows logically from the Core Problem.
- Point of View changes how the buyer interprets the problem.
- Offer Explanation explains the resolved offer without regurgitating a saved field.
- Deliverables and proof remain strictly verified.
- Objection, message progression, CTA, and channel roles support the same argument.
- No field sounds like form values were concatenated or inserted into a reusable template.

Automatically reject or rewrite language such as:
- trying to easy marketing
- evaluating Demo
- fragmented execution is limiting progress
- reactive, disconnected, or one-off efforts
- the workaround may keep activity moving
- dependable path for deciding what should happen next
- the buyer's decisions and day-to-day actions
- desired business outcome
- one-off judgment instead of a consistent process

Return a fully rewritten strategy when any field is weak. Set approved to true only when the returned strategy itself meets the standard. Set approved to false when the available facts are too contradictory or thin to produce a responsible strategy without invention.

Return only valid JSON with exactly this shape:
${qualityReviewJsonContract()}`;
}

export function buildQualityReviewUserPrompt({
  brief,
  plan,
  strategy,
  issues,
}: {
  brief: ResolvedCampaignBrief;
  plan: StrategySemanticPlan;
  strategy: OneOffCampaignStrategy;
  issues: StrategyValidationIssue[];
}) {
  return `Perform the final editorial review.

## Canonical brief
${formatResolvedCampaignBrief(brief)}

## Approved semantic plan
${formatStrategySemanticPlan(plan)}

## Deterministic diagnostic
${formatStrategyValidationIssues(issues)}

## Strategy under review
${JSON.stringify(strategy, null, 2)}

Rewrite any weak field and return the complete reviewed strategy. The issues array should briefly state any remaining concern. Set approved to true only when no meaningful concern remains.`;
}
