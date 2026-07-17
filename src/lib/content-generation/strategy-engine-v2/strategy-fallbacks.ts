import type { OneOffCampaignStrategy } from "../one-off-strategy-gate.ts";
import type { ResolvedCampaignBrief, StrategyFieldKey, StrategyValidationIssue } from "./types.ts";

function clean(value: unknown, maxLength = 1200) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}
function stripEnd(value: string) { return clean(value).replace(/[.!?;:,]+$/, ""); }
function lowerFirst(value: string) { const text = clean(value); return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : ""; }
function primaryPain(brief: ResolvedCampaignBrief) { return stripEnd(brief.audience.painSignals[0] || brief.campaignTopic || "the current approach is no longer producing a dependable result"); }
function primaryOutcome(brief: ResolvedCampaignBrief) { return stripEnd(brief.audience.desiredOutcomes[0] || brief.verifiedOfferFacts.outcome || brief.campaignGoal || "make steady progress toward the desired business result"); }
function topicPhrase(brief: ResolvedCampaignBrief) { const topic = stripEnd(brief.campaignTopic); return !topic ? "the issue" : topic.length > 180 ? `${topic.slice(0,177).trim()}...` : topic; }

function offerMechanism(brief: ResolvedCampaignBrief) {
  const offer = brief.promotedOffer.name; const topic = topicPhrase(brief);
  switch (brief.promotedOffer.category) {
    case "demo": return `${offer} shows the buyer how the relevant workflow operates in practice, connecting the problem described in this campaign to the platform's planning and execution capabilities. The demonstration helps the buyer judge fit, usefulness, and the next decision before making a larger commitment.`;
    case "audit": return `${offer} reviews the buyer's current approach against the problem and desired outcome, identifies the most important gaps, and organizes what deserves attention first. That mechanism gives the buyer a clearer basis for deciding what to change instead of adding more activity without direction.`;
    case "consultation": return `${offer} uses a focused conversation to clarify the buyer's situation, isolate the most important obstacle, and compare practical next steps. The value comes from turning a broad concern into a decision the buyer can evaluate with better context.`;
    case "webinar": return `${offer} teaches the buyer how to interpret ${lowerFirst(topic)} through a structured explanation, practical examples, and a clear decision framework. The session helps the buyer recognize the problem and understand which next step fits their situation.`;
    case "guide": return `${offer} organizes the essential information about ${lowerFirst(topic)} into a practical reference the buyer can review and apply. Its mechanism is to replace scattered information with a clear sequence for understanding the issue and evaluating the next step.`;
    case "trial": return `${offer} lets the buyer evaluate the relevant experience in a limited, lower-commitment setting before making a broader decision. The mechanism reduces uncertainty by allowing the buyer to judge practical fit rather than relying only on claims.`;
    case "informational": return `This campaign explains ${lowerFirst(topic)} without forcing a direct sales offer. It gives the buyer a clearer way to interpret the problem, compare the familiar approach with a better one, and decide whether any next step is warranted.`;
    default: return `${offer} gives the buyer a structured way to address ${lowerFirst(topic)}, connecting the current problem to a practical mechanism and a clear next decision. The explanation should focus on how the offer helps the buyer move from uncertainty to an informed next step.`;
  }
}
function offerDeliverables(brief: ResolvedCampaignBrief) {
  if (brief.verifiedOfferFacts.deliverables.length) return `The verified deliverables are: ${brief.verifiedOfferFacts.deliverables.join("; ")}. Do not add outputs that are not listed in the selected offer record.`;
  if (brief.promotedOffer.category === "demo") return `The verified deliverable is the ${brief.promotedOffer.name} itself: a direct demonstration of the relevant workflow and capabilities. No additional written, implementation, or follow-up deliverable is established by this campaign brief.`;
  if (brief.promotedOffer.category === "informational") return "This is an informational campaign, so no separate customer deliverable is established. The strategy should educate clearly without implying a report, package, or implementation commitment.";
  return `The verified deliverable is the promoted offer, ${brief.promotedOffer.name}. The current brief does not establish a separate deliverable list, so the exact outputs should be confirmed before approval rather than inferred.`;
}
function proofStatement(brief: ResolvedCampaignBrief) {
  return brief.approvedProof.length ? `Use only this approved support: ${brief.approvedProof.join("; ")}. Present it accurately and do not extend it into an unsupported result, guarantee, ranking, or customer claim.` : "No approved quantitative proof, testimonial, case study, or verified performance claim was supplied. Support the argument with clear reasoning and verified offer facts only.";
}
function objectionStatement(brief: ResolvedCampaignBrief) {
  const objection = stripEnd(brief.audience.objections[0] || brief.internalGuidance.objections || `whether ${brief.promotedOffer.name} will be relevant enough to justify the time`);
  return `A likely concern is ${lowerFirst(objection)}. Address it by explaining the scope and decision value plainly, so the buyer can judge fit without pressure or an unsupported promise.`;
}
function channelDirection(brief: ResolvedCampaignBrief) {
  const roles: Record<string,string> = {
    email: "connect one recognizable buyer moment to the resolved offer and one direct CTA",
    linkedin: "lead with the campaign's distinctive professional point of view and business consequence",
    facebook: "use an accessible customer scenario, plain-language insight, and a low-friction next step",
    youtube: "show the problem-to-solution progression visually and end on the resolved offer",
    video: "show the problem-to-solution progression visually and end on the resolved offer",
    blog: "develop the full argument from buyer situation through consequence, point of view, and offer",
    instagram: "make one customer tension visually clear and connect it to the resolved next step",
    x: "compress the point of view into a concise contrast and link it to the primary CTA",
  };
  const channels = brief.platforms.length ? brief.platforms : ["Email","LinkedIn","Facebook","YouTube"];
  return channels.map((channel) => {
    const key = channel.toLowerCase();
    const role = Object.entries(roles).find(([name]) => key.includes(name))?.[1] || "adapt the approved argument to the channel while preserving the resolved offer and CTA";
    return `${channel}: ${role}.`;
  }).join("\n");
}

export function buildDeterministicStrategy(brief: ResolvedCampaignBrief): OneOffCampaignStrategy {
  const audience = brief.audience.label; const pain = primaryPain(brief); const outcome = primaryOutcome(brief); const cta = clean(brief.primaryCta) || `Learn more about ${brief.promotedOffer.name}`;
  return {
    campaignObjective: `Move ${lowerFirst(audience)} from recognizing that fragmented execution is limiting progress to viewing “${cta}” as the practical next step for evaluating ${brief.promotedOffer.name}.`,
    targetAudience: audience,
    buyerSituation: `When ${lowerFirst(audience)} are trying to ${lowerFirst(outcome)} but still rely on reactive, disconnected, or one-off efforts, they begin to see that ${lowerFirst(pain)}. The workaround may keep activity moving, but it no longer provides a dependable path for deciding what should happen next, making the issue worth addressing now.`,
    coreProblem: `The underlying problem stems from the lack of a repeatable system for connecting the buyer's decisions and day-to-day actions to the desired business outcome. Because the work remains fragmented and reactive, progress depends too heavily on one-off judgment instead of a consistent process.`,
    businessConsequence: `If the issue continues, the business risks spending more time managing disconnected activity while progress toward the desired outcome—${lowerFirst(outcome)}—remains inconsistent. Decisions take longer, opportunities are easier to miss, and the result becomes harder to repeat.`,
    campaignPointOfView: `The better approach is not to add more isolated activity. It is to make the problem, decision path, and next action visible as one connected system, so the buyer can judge what deserves attention before committing more time or money.`,
    offerExplanation: offerMechanism(brief),
    offerDeliverables: offerDeliverables(brief),
    proofAndSupport: proofStatement(brief),
    objectionsAndResponse: objectionStatement(brief),
    messageProgression: [
      "1. Open with the buyer's recognizable trigger and current workaround.",
      "2. Reveal the customer-side cause that makes the workaround unreliable.",
      "3. Trace the operational or opportunity consequence of continuing unchanged.",
      "4. Introduce the campaign point of view and show why the familiar response falls short.",
      `5. Explain how ${brief.promotedOffer.name} addresses the decision and what is verifiably included.`,
      `6. Answer the strongest objection and close with one action: ${cta}.`,
    ].join("\n"),
    primaryCta: cta,
    contentDirection: channelDirection(brief),
  };
}
function fieldsToReplace(issues: StrategyValidationIssue[]) {
  const fields = new Set<StrategyFieldKey>();
  for (const issue of issues) {
    if (issue.field === "offerAuthority") { ["campaignObjective","campaignPointOfView","offerExplanation","offerDeliverables","messageProgression","primaryCta","contentDirection"].forEach((field) => fields.add(field as StrategyFieldKey)); continue; }
    if (issue.field === "crossSection") { ["buyerSituation","coreProblem","businessConsequence","campaignPointOfView","offerExplanation","offerDeliverables"].forEach((field) => fields.add(field as StrategyFieldKey)); continue; }
    fields.add(issue.field);
  }
  return fields;
}
export function applyDeterministicStrategySafeguards({ strategy, brief, issues }: { strategy: OneOffCampaignStrategy; brief: ResolvedCampaignBrief; issues: StrategyValidationIssue[] }) {
  if (!issues.length) return strategy;
  const fallback = buildDeterministicStrategy(brief); const fields = fieldsToReplace(issues); const next = { ...strategy };
  for (const field of fields) next[field] = fallback[field];
  return next;
}
