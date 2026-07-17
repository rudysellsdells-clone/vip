import type {
  OfferCategory,
  ResolvedCampaignBrief,
} from "./types.ts";

const GENERIC_OFFER_WORDS = new Set([
  "and",
  "business",
  "campaign",
  "company",
  "for",
  "free",
  "marketing",
  "offer",
  "our",
  "service",
  "session",
  "the",
  "to",
  "your",
]);

const CATEGORY_REFERENCE_TERMS: Record<OfferCategory, string[]> = {
  demo: ["demo", "demonstration", "walkthrough"],
  audit: ["audit", "assessment", "diagnostic"],
  consultation: ["consultation", "consult", "conversation", "advisory call"],
  webinar: ["webinar", "workshop", "seminar", "class"],
  guide: ["guide", "checklist", "playbook", "ebook", "template"],
  trial: ["trial", "pilot", "test drive", "proof of concept"],
  product: ["product", "platform", "software", "subscription"],
  service: ["service", "project", "retainer", "implementation"],
  informational: ["information", "educational", "awareness"],
  unknown: [],
};

const GENERAL_MECHANISM_ACTIONS = /\b(allows?|answers?|assesses?|automates?|builds?|clarifies?|combines?|compares?|connects?|coordinates?|creates?|demonstrates?|discusses?|enables?|evaluates?|examines?|explains?|explores?|gives?|guides?|helps?|identifies?|illustrates?|lets?|maps?|organizes?|outlines?|presents?|prioritizes?|provides?|reviews?|shows?|teaches?|tests?|turns?|uses?|walks? through)\b/i;

const CATEGORY_MECHANISM_PATTERNS: Record<OfferCategory, RegExp[]> = {
  demo: [
    /\b(show|shows|demonstrate|demonstrates|walk through|walks through|preview|previews|illustrate|illustrates|present|presents)\b/i,
    /\b(see|view|experience|evaluate|judge)\b.{0,90}\b(workflow|platform|process|capabilit|fit)\b/i,
  ],
  audit: [
    /\b(review|reviews|analyze|analyzes|assess|assesses|examine|examines|identify|identifies|compare|compares|prioritize|prioritizes)\b/i,
    /\b(find|finds|surface|surfaces|pinpoint|pinpoints)\b.{0,90}\b(gap|issue|opportunit|priority|risk)\b/i,
  ],
  consultation: [
    /\b(discuss|discusses|explore|explores|clarify|clarifies|answer|answers|guide|guides|evaluate|evaluates|determine|determines|ask|asks)\b/i,
    /\b(focused|direct|one-to-one|one-on-one)\s+(conversation|discussion|consultation|call)\b/i,
    /\b(conversation|consultation|call)\b.{0,120}\b(priority|question|situation|challenge|fit|option)\b/i,
  ],
  webinar: [
    /\b(teach|teaches|explain|explains|walk through|walks through|cover|covers|show|shows|demonstrate|demonstrates)\b/i,
    /\b(session|webinar|workshop|seminar)\b.{0,120}\b(learn|understand|apply|compare|decide)\b/i,
  ],
  guide: [
    /\b(organize|organizes|explain|explains|outline|outlines|teach|teaches|guide|guides|walk through|walks through|provide|provides)\b/i,
    /\b(guide|checklist|playbook|ebook|template)\b.{0,120}\b(understand|apply|compare|plan|decide|complete)\b/i,
  ],
  trial: [
    /\b(try|tries|test|tests|evaluate|evaluates|experience|experiences|use|uses|explore|explores)\b/i,
    /\b(trial|pilot|test drive|proof of concept)\b.{0,120}\b(fit|workflow|experience|result|decision)\b/i,
  ],
  product: [GENERAL_MECHANISM_ACTIONS],
  service: [GENERAL_MECHANISM_ACTIONS],
  informational: [
    /\b(explain|explains|teach|teaches|clarify|clarifies|outline|outlines|compare|compares|show|shows)\b/i,
  ],
  unknown: [GENERAL_MECHANISM_ACTIONS],
};

const BUYER_VALUE_MARKERS = /\b(ask|choose|clarify|compare|decide|determine|evaluate|fit|identify|judge|learn|next step|prioritize|question|see|situation|understand)\b/i;

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function meaningfulOfferTokens(value: string) {
  return Array.from(
    new Set(
      clean(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((token) => token.replace(/^-+|-+$/g, ""))
        .filter(
          (token) =>
            token.length >= 3 && !GENERIC_OFFER_WORDS.has(token),
        ),
    ),
  );
}

export function offerMechanismReferencesResolvedOffer(
  value: string,
  brief: ResolvedCampaignBrief,
) {
  const normalized = clean(value).toLowerCase();
  const offerName = clean(brief.promotedOffer.name).toLowerCase();
  if (!offerName) return true;
  if (normalized.includes(offerName)) return true;

  const categoryTerms = CATEGORY_REFERENCE_TERMS[
    brief.promotedOffer.category
  ].filter((term) => term.length >= 3);
  if (categoryTerms.some((term) => normalized.includes(term))) return true;

  const offerTokens = meaningfulOfferTokens(brief.promotedOffer.name);
  return offerTokens.some((token) => normalized.includes(token));
}

export function offerMechanismExplainsBuyerAction(
  value: string,
  brief: ResolvedCampaignBrief,
) {
  const text = clean(value);
  if (!text) return false;

  const categoryPatterns =
    CATEGORY_MECHANISM_PATTERNS[brief.promotedOffer.category] ??
    CATEGORY_MECHANISM_PATTERNS.unknown;
  const hasCategoryAction = categoryPatterns.some((pattern) =>
    pattern.test(text),
  );
  const hasGeneralAction = GENERAL_MECHANISM_ACTIONS.test(text);
  const hasBuyerValue = BUYER_VALUE_MARKERS.test(text);
  const requiresCategorySpecificAction = ![
    "product",
    "service",
    "unknown",
  ].includes(brief.promotedOffer.category);
  // Recognized offer types must use action language that fits the actual buyer
  // experience. Those category-specific patterns are meaningful by themselves
  // (for example, a demo “shows” a workflow or a consultation “discusses”
  // priorities). Generic product or service language must also state buyer value
  // so vague claims such as “the service helps” do not pass.
  if (requiresCategorySpecificAction) return hasCategoryAction;
  return (hasCategoryAction || hasGeneralAction) && hasBuyerValue;
}

export function offerMechanismGuidance(brief: ResolvedCampaignBrief) {
  const offer = brief.promotedOffer.name;
  switch (brief.promotedOffer.category) {
    case "demo":
      return `Explain how ${offer} lets the buyer see the relevant workflow or experience in practice and evaluate fit. Do not invent capabilities that are not in the canonical brief.`;
    case "audit":
      return `Explain how ${offer} reviews or analyzes the buyer's current situation, identifies meaningful gaps or priorities, and supports a better decision. Use only verified deliverables.`;
    case "consultation":
      return `Explain ${offer} as a focused conversation in which the buyer can discuss the current situation, ask questions, clarify priorities, and determine whether a practical next step fits. Do not promise a report, plan, implementation, or guaranteed advice unless verified.`;
    case "webinar":
      return `Explain how ${offer} teaches or walks through the topic so the buyer can understand the issue, compare options, and decide on a next step.`;
    case "guide":
      return `Explain how ${offer} organizes or explains the topic so the buyer can understand it and apply or evaluate a practical next step. Mention only verified included materials.`;
    case "trial":
      return `Explain how ${offer} lets the buyer try or evaluate the experience in a limited setting and judge practical fit before a larger decision.`;
    case "informational":
      return `Explain how the informational campaign clarifies the issue and helps the buyer understand or compare reasonable next steps without implying a direct deliverable.`;
    default:
      return `Explain what ${offer} actually does during the buyer's next step and how that action helps the buyer understand, evaluate, prioritize, or decide. Do not rely on vague benefit language.`;
  }
}
