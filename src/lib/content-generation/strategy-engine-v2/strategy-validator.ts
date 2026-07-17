import type { OneOffCampaignStrategy } from "../one-off-strategy-gate.ts";
import { STRATEGY_FIELD_CONTRACTS } from "./field-contracts.ts";
import type { ResolvedCampaignBrief, StrategyFieldKey, StrategyValidationIssue } from "./types.ts";

const STOP_WORDS = new Set(["about","after","again","also","and","are","because","been","before","being","business","campaign","company","could","from","have","into","more","most","need","offer","only","other","should","that","their","there","these","they","this","through","using","very","want","what","when","where","which","while","with","would","your"]);
const MOMENT_MARKERS = /\b(when|as|after|before|once|during|currently|right now|recently|at the point|at the moment|starts to|begins to)\b/i;
const CURRENT_BEHAVIOR_MARKERS = /\b(currently|today|still|rely|relies|relying|handle|handles|handling|manage|manages|managing|piecemeal|reactive|reactively|between|alongside|sporadic|occasional|ad hoc|workaround)\b/i;
const CAUSAL_MARKERS = /\b(because|caused by|comes from|stems from|underlying|root|without|fragmented|inconsistent|reactive|depends on|absence of|lack of|disconnect between)\b/i;
const CONSEQUENCE_MARKERS = /\b(cost|costs|lose|loses|miss|misses|risk|risks|delay|delays|prevent|prevents|limits|unpredictable|inconsistent|dependence|wasted|slower|harder|erodes|leaves|results in|leads to)\b/i;
const CONTRAST_MARKERS = /\b(not simply|not just|instead|rather than|works when|only works when|more than|before|first|better approach|should)\b/i;
const MECHANISM_MARKERS = /\b(by|through|starts with|begins with|reviews|analyzes|assesses|identifies|maps|organizes|connects|turns|compares|prioritizes|builds|creates|automates|coordinates|combines|shows|examines|demonstrates|walks through)\b/i;
const ROLE_MARKERS = /\b(owner|owners|operator|operators|manager|managers|director|directors|leader|leaders|decision-maker|decision-makers|executive|executives|administrator|administrators|founder|founders|principal|principals)\b/i;
const VENDOR_MARKERS = /\b(marketing vip|web search professionals|our company|our agency|our platform|we need|we want|our issue|the user|form field|brand area|campaign creator)\b/i;
const META_LANGUAGE = /\b(build a realistic moment|not explicitly established|not explicitly supplied|explain the operational|explain exactly|the audience should understand|the buyer needs to understand|use practical explanation|without inventing|selected buyer|campaign idea|account strategy|brand voice|source context|strategy context|field label)\b/i;
const GENERIC_LANGUAGE = /\b(build trust|increase visibility|improve visibility|grow the business|grow your business|save time|easy marketing|marketing that works|reach more customers|get more leads|drive growth|achieve their goals|stand out from the competition|take their business to the next level)\b/i;

function clean(value: unknown, maxLength = 5000) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}
function wordCount(value: string) { return clean(value).split(/\s+/).filter(Boolean).length; }
function tokens(value: string) {
  return new Set(clean(value).toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).map((token) => token.replace(/^-+|-+$/g, "")).filter((token) => token.length >= 3 && !STOP_WORDS.has(token)));
}
function similarity(left: string, right: string) {
  const leftTokens = tokens(left); const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  let overlap = 0; for (const token of leftTokens) if (rightTokens.has(token)) overlap += 1;
  return overlap / Math.min(leftTokens.size, rightTokens.size);
}
function looksMalformed(value: string) {
  const text = clean(value);
  if (!text) return true;
  return /\b(\w+)\s+\1\b/i.test(text) || /\s[,:;]\s*[.!?]?$/.test(text) || /^(and|but|because|which|that)\b/i.test(text) || /\bto to\b|\bthe the\b|\band and\b/i.test(text);
}
function addIssue(issues: StrategyValidationIssue[], field: StrategyValidationIssue["field"], code: string, severity: StrategyValidationIssue["severity"], message: string) {
  if (!issues.some((issue) => issue.field === field && issue.code === code)) issues.push({ field, code, severity, message });
}
function includesSourceSentence(value: string, source: string) {
  const output = clean(value).toLowerCase(); const raw = clean(source).toLowerCase();
  if (!output || !raw || wordCount(raw) < 7) return false;
  return (raw.length >= 70 && output.includes(raw)) || similarity(value, source) >= 0.88;
}
function hasForbiddenOfferTerm(value: string, brief: ResolvedCampaignBrief) {
  const normalized = clean(value).toLowerCase();
  return brief.promotedOffer.forbiddenTerms.find((term) => normalized.includes(term.toLowerCase()));
}
function offerMentioned(value: string, brief: ResolvedCampaignBrief) {
  const valueTokens = tokens(value); const offerTokens = Array.from(tokens(brief.promotedOffer.name));
  return !offerTokens.length || offerTokens.some((token) => valueTokens.has(token));
}
function selectedChannelMissing(value: string, channels: string[]) {
  const normalized = value.toLowerCase(); return channels.find((channel) => !normalized.includes(channel.toLowerCase()));
}

export function validateStrategy({ strategy, brief }: { strategy: OneOffCampaignStrategy; brief: ResolvedCampaignBrief }) {
  const issues: StrategyValidationIssue[] = [];
  const fields = Object.entries(strategy) as Array<[StrategyFieldKey, string]>;
  for (const [field, value] of fields) {
    const contract = STRATEGY_FIELD_CONTRACTS[field]; const count = wordCount(value);
    if (!clean(value)) { addIssue(issues, field, "missing_field", "critical", `${contract.label} is missing.`); continue; }
    if (looksMalformed(value)) addIssue(issues, field, "malformed_language", "critical", `${contract.label} contains incomplete, duplicated, or non-logical language.`);
    if (count < contract.minWords || count > contract.maxWords) addIssue(issues, field, "field_length_outside_contract", "warning", `${contract.label} should be ${contract.minWords}-${contract.maxWords} words; it is ${count}.`);
    if (META_LANGUAGE.test(value)) addIssue(issues, field, "internal_language_leak", "critical", `${contract.label} exposes internal planning or source language.`);
    const sourceCandidates = [brief.audience.buyerDescription, brief.verifiedOfferFacts.description, brief.relatedService.description, brief.internalGuidance.differentiator, brief.internalGuidance.originalityAngle, brief.internalGuidance.creatorNotes].filter(Boolean);
    if (!["offerDeliverables", "proofAndSupport", "primaryCta"].includes(field) && sourceCandidates.some((source) => includesSourceSentence(value, source))) addIssue(issues, field, "source_regurgitation", "critical", `${contract.label} substantially repeats saved source wording instead of producing a strategic conclusion.`);
    const forbidden = hasForbiddenOfferTerm(value, brief);
    if (forbidden) addIssue(issues, "offerAuthority", `ignored_offer_reintroduced_${field}`, "critical", `${contract.label} reintroduces the excluded offer term “${forbidden}.” The only promoted offer is “${brief.promotedOffer.name}.”`);
  }
  if (!ROLE_MARKERS.test(strategy.targetAudience) || /[|]/.test(strategy.targetAudience)) addIssue(issues, "targetAudience", "audience_not_one_decision_maker", "critical", "Target Audience must identify one primary decision-maker and business context, not a market list.");
  if (!MOMENT_MARKERS.test(strategy.buyerSituation) || !CURRENT_BEHAVIOR_MARKERS.test(strategy.buyerSituation) || VENDOR_MARKERS.test(strategy.buyerSituation)) addIssue(issues, "buyerSituation", "buyer_situation_not_customer_moment", "critical", "Buyer Situation must describe the customer trigger, current workaround, breakdown, and urgency—not the vendor or creator situation.");
  if (!CAUSAL_MARKERS.test(strategy.coreProblem) || VENDOR_MARKERS.test(strategy.coreProblem)) addIssue(issues, "coreProblem", "core_problem_not_customer_cause", "critical", "Core Problem must explain the customer-side cause behind the visible symptom.");
  if (!CONSEQUENCE_MARKERS.test(strategy.businessConsequence) || VENDOR_MARKERS.test(strategy.businessConsequence)) addIssue(issues, "businessConsequence", "consequence_not_downstream_effect", "critical", "Business Consequence must explain what the customer loses, risks, delays, or cannot achieve.");
  if (GENERIC_LANGUAGE.test(strategy.campaignObjective)) addIssue(issues, "campaignObjective", "generic_objective", "warning", "Campaign Objective uses generic marketing language instead of a specific decision change.");
  if (GENERIC_LANGUAGE.test(strategy.campaignPointOfView) || !CONTRAST_MARKERS.test(strategy.campaignPointOfView)) addIssue(issues, "campaignPointOfView", "point_of_view_not_distinctive", "critical", "Campaign Point of View must contrast the familiar approach with a better one.");
  if (!MECHANISM_MARKERS.test(strategy.offerExplanation)) addIssue(issues, "offerExplanation", "offer_explanation_lacks_mechanism", "critical", "Offer Explanation must describe how the resolved promoted offer works and why its mechanism helps.");
  if (!offerMentioned(strategy.offerExplanation, brief)) addIssue(issues, "offerExplanation", "offer_explanation_not_resolved_offer", "critical", `Offer Explanation must clearly describe “${brief.promotedOffer.name}.”`);
  if (!brief.verifiedOfferFacts.deliverables.length) {
    const invented = strategy.offerDeliverables.match(/\b(report|roadmap|implementation plan|recommendations document|assessment|diagnostic|written analysis|scorecard)\b/i);
    if (invented && brief.promotedOffer.category !== "audit") addIssue(issues, "offerDeliverables", "invented_deliverable", "critical", `Offer Deliverables invents “${invented[0]},” which is not verified for this offer.`);
  }
  if (!brief.approvedProof.length && !/\b(no approved|no quantitative|not supplied|none supplied|not established)\b/i.test(strategy.proofAndSupport)) addIssue(issues, "proofAndSupport", "unsupported_proof", "critical", "Proof and Support must state honestly that no approved proof was supplied instead of implying evidence.");
  if (brief.primaryCta && similarity(strategy.primaryCta, brief.primaryCta) < 0.5) addIssue(issues, "primaryCta", "cta_drift", "critical", `Primary CTA drifted from the approved campaign CTA “${brief.primaryCta}.”`);
  const missingChannel = selectedChannelMissing(strategy.contentDirection, brief.platforms);
  if (missingChannel) addIssue(issues, "contentDirection", "channel_missing", "warning", `Channel Direction does not assign a role to the selected channel “${missingChannel}.”`);
  const crossPairs: Array<[StrategyFieldKey, StrategyFieldKey, number]> = [["buyerSituation", "coreProblem", 0.68], ["coreProblem", "businessConsequence", 0.68], ["campaignPointOfView", "offerExplanation", 0.72], ["offerExplanation", "offerDeliverables", 0.7]];
  for (const [left, right, threshold] of crossPairs) {
    if (similarity(strategy[left], strategy[right]) >= threshold) addIssue(issues, "crossSection", `${left}_${right}_overlap`, "critical", `${STRATEGY_FIELD_CONTRACTS[left].label} and ${STRATEGY_FIELD_CONTRACTS[right].label} repeat the same idea instead of performing separate strategic jobs.`);
  }
  return issues;
}
export function criticalStrategyIssues(issues: StrategyValidationIssue[]) { return issues.filter((issue) => issue.severity === "critical"); }
export function formatStrategyValidationIssues(issues: StrategyValidationIssue[]) {
  return issues.length ? issues.map((issue, index) => `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`).join("\n") : "No strategy validation issues detected.";
}
