import type {
  ResolvedCampaignBrief,
  StrategySemanticPlan,
  StrategySemanticPlanIssue,
  StrategySemanticPlanKey,
} from "./types.ts";

type UnknownRecord = Record<string, unknown>;

const PLAN_FIELDS: StrategySemanticPlanKey[] = [
  "buyerTrigger",
  "currentWorkaround",
  "rootCause",
  "businessConsequence",
  "campaignBelief",
  "offerMechanism",
  "desiredDecision",
  "primaryObjection",
  "objectionResponse",
];

const VENDOR_MARKERS = /\b(marketing vip|web search professionals|our company|our agency|our platform|we need|we want|our issue|the user|form field|brand area|campaign creator)\b/i;
const INTERNAL_MARKERS = /\b(not specifically established|not explicitly supplied|build a realistic moment|the audience should understand|the buyer needs to understand|campaign idea|account strategy|brand voice|source context|strategy context|field label|desired business outcome)\b/i;
const FALLBACK_SCAFFOLDING = /\b(fragmented execution is limiting progress|reactive, disconnected, or one-off efforts|the workaround may keep activity moving|dependable path for deciding what should happen next|the buyer's decisions and day-to-day actions|one-off judgment instead of a consistent process|the better approach is not to add more isolated activity)\b/i;
const AWKWARD_GRAMMAR = /\btrying to\s+(easy|simple|better|effective|consistent|reliable|affordable|branding|marketing|limited|no)\b|\bfor evaluating\s+(demo|audit|consultation|guide|webinar)\b|\.\s*\.|\.,/i;
const ROOT_CAUSE_MARKERS = /\b(because|without|lacks?|lack of|depends on|rely|relies|relying|fragmented|inconsistent|reactive|no repeatable|absence of|disconnect)\b/i;
const CONSEQUENCE_MARKERS = /\b(cost|costs|lose|loses|miss|misses|risk|risks|delay|delays|prevent|prevents|limits|unpredictable|inconsistent|dependence|wasted|slower|harder|erodes|leaves|results in|leads to|remains)\b/i;
const CONTRAST_MARKERS = /\b(not just|not simply|rather than|instead|works when|before|first|better approach|should|does not require|is not solved by|isn\'t solved by)\b/i;
const MECHANISM_MARKERS = /\b(shows|demonstrates|walks through|reviews|analyzes|assesses|identifies|maps|organizes|connects|turns|compares|prioritizes|builds|creates|automates|coordinates|combines|examines)\b/i;

const MIN_WORDS: Record<StrategySemanticPlanKey, number> = {
  buyerTrigger: 8,
  currentWorkaround: 8,
  rootCause: 10,
  businessConsequence: 10,
  campaignBelief: 10,
  offerMechanism: 12,
  desiredDecision: 7,
  primaryObjection: 5,
  objectionResponse: 8,
};

const MAX_WORDS: Record<StrategySemanticPlanKey, number> = {
  buyerTrigger: 45,
  currentWorkaround: 45,
  rootCause: 55,
  businessConsequence: 55,
  campaignBelief: 55,
  offerMechanism: 70,
  desiredDecision: 40,
  primaryObjection: 30,
  objectionResponse: 45,
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clean(value: unknown, maxLength = 1200) {
  const text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function wordCount(value: string) {
  return clean(value).split(/\s+/).filter(Boolean).length;
}

function tokens(value: string) {
  return new Set(
    clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3),
  );
}

function similarity(left: string, right: string) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

function offerMentioned(value: string, brief: ResolvedCampaignBrief) {
  const valueTokens = tokens(value);
  const offerTokens = Array.from(tokens(brief.promotedOffer.name));
  return !offerTokens.length || offerTokens.some((token) => valueTokens.has(token));
}

function hasForbiddenOfferTerm(value: string, brief: ResolvedCampaignBrief) {
  const normalized = clean(value).toLowerCase();
  return brief.promotedOffer.forbiddenTerms.find((term) =>
    normalized.includes(term.toLowerCase()),
  );
}

function sourceFragments(brief: ResolvedCampaignBrief) {
  return [
    brief.audience.buyerDescription,
    ...brief.audience.painSignals,
    ...brief.audience.desiredOutcomes,
    ...brief.audience.objections,
    brief.campaignTopic,
    brief.internalGuidance.creatorNotes,
    brief.internalGuidance.differentiator,
    brief.internalGuidance.originalityAngle,
  ]
    .map((value) => clean(value, 1600))
    .filter((value) => wordCount(value) >= 7);
}

function looksCopied(value: string, brief: ResolvedCampaignBrief) {
  const normalized = clean(value).toLowerCase();
  return sourceFragments(brief).some((source) => {
    const sourceNormalized = source.toLowerCase();
    return (
      (sourceNormalized.length >= 70 && normalized.includes(sourceNormalized)) ||
      similarity(value, source) >= 0.92
    );
  });
}

function addIssue(
  issues: StrategySemanticPlanIssue[],
  field: StrategySemanticPlanIssue["field"],
  code: string,
  message: string,
) {
  if (!issues.some((issue) => issue.field === field && issue.code === code)) {
    issues.push({ field, code, message });
  }
}

export function normalizeStrategySemanticPlan(value: unknown): StrategySemanticPlan {
  const record = isRecord(value) ? value : {};
  const plan = {} as StrategySemanticPlan;

  for (const field of PLAN_FIELDS) {
    plan[field] = clean(record[field], 1200);
  }

  return plan;
}

export function validateStrategySemanticPlan({
  plan,
  brief,
}: {
  plan: StrategySemanticPlan;
  brief: ResolvedCampaignBrief;
}) {
  const issues: StrategySemanticPlanIssue[] = [];

  for (const field of PLAN_FIELDS) {
    const value = plan[field];
    const count = wordCount(value);

    if (!value) {
      addIssue(issues, field, "missing_plan_field", `${field} is missing.`);
      continue;
    }

    if (count < MIN_WORDS[field] || count > MAX_WORDS[field]) {
      addIssue(
        issues,
        field,
        "plan_field_length",
        `${field} must be a concise complete thought, not a fragment or paragraph dump.`,
      );
    }

    if (INTERNAL_MARKERS.test(value) || FALLBACK_SCAFFOLDING.test(value)) {
      addIssue(
        issues,
        field,
        "planning_scaffolding",
        `${field} contains internal or reusable template language instead of campaign-specific reasoning.`,
      );
    }

    if (AWKWARD_GRAMMAR.test(value)) {
      addIssue(
        issues,
        field,
        "awkward_plan_language",
        `${field} contains a stitched or non-logical phrase.`,
      );
    }

    if (looksCopied(value, brief)) {
      addIssue(
        issues,
        field,
        "plan_source_regurgitation",
        `${field} repeats source wording instead of interpreting it.`,
      );
    }

    const forbidden = hasForbiddenOfferTerm(value, brief);
    if (forbidden) {
      addIssue(
        issues,
        "offerAuthority",
        `plan_reintroduced_${field}`,
        `${field} reintroduces the excluded offer term “${forbidden}.”`,
      );
    }
  }

  for (const field of [
    "buyerTrigger",
    "currentWorkaround",
    "rootCause",
    "businessConsequence",
  ] as const) {
    if (VENDOR_MARKERS.test(plan[field])) {
      addIssue(
        issues,
        field,
        "vendor_centered_plan",
        `${field} must describe the customer's business reality, not the vendor or campaign creator.`,
      );
    }
  }

  if (!ROOT_CAUSE_MARKERS.test(plan.rootCause)) {
    addIssue(
      issues,
      "rootCause",
      "plan_root_cause_missing",
      "rootCause must explain why the customer's current approach keeps failing.",
    );
  }

  if (!CONSEQUENCE_MARKERS.test(plan.businessConsequence)) {
    addIssue(
      issues,
      "businessConsequence",
      "plan_consequence_missing",
      "businessConsequence must state what the customer loses, risks, delays, or cannot achieve.",
    );
  }

  if (!CONTRAST_MARKERS.test(plan.campaignBelief)) {
    addIssue(
      issues,
      "campaignBelief",
      "plan_belief_not_distinctive",
      "campaignBelief must contrast the familiar approach with a better one.",
    );
  }

  if (!MECHANISM_MARKERS.test(plan.offerMechanism)) {
    addIssue(
      issues,
      "offerMechanism",
      "plan_offer_mechanism_missing",
      "offerMechanism must explain what the resolved offer actually does during the buyer's next step.",
    );
  }

  if (!offerMentioned(plan.offerMechanism, brief)) {
    addIssue(
      issues,
      "offerMechanism",
      "plan_offer_mismatch",
      `offerMechanism must clearly describe “${brief.promotedOffer.name}.”`,
    );
  }

  if (
    brief.primaryCta &&
    similarity(plan.desiredDecision, brief.primaryCta) < 0.3 &&
    !offerMentioned(plan.desiredDecision, brief)
  ) {
    addIssue(
      issues,
      "desiredDecision",
      "plan_decision_drift",
      `desiredDecision must lead naturally to “${brief.primaryCta}.”`,
    );
  }

  const distinctPairs: Array<[
    StrategySemanticPlanKey,
    StrategySemanticPlanKey,
    number,
  ]> = [
    ["buyerTrigger", "currentWorkaround", 0.76],
    ["rootCause", "businessConsequence", 0.68],
    ["campaignBelief", "offerMechanism", 0.74],
    ["primaryObjection", "objectionResponse", 0.82],
  ];

  for (const [left, right, threshold] of distinctPairs) {
    if (similarity(plan[left], plan[right]) >= threshold) {
      addIssue(
        issues,
        "crossSection",
        `${left}_${right}_overlap`,
        `${left} and ${right} repeat the same thought instead of performing separate reasoning jobs.`,
      );
    }
  }

  return issues;
}

export function formatStrategySemanticPlan(plan: StrategySemanticPlan) {
  return [
    "## Approved private semantic plan",
    "These are reasoning conclusions, not sentences to copy verbatim into the visible strategy.",
    `Buyer trigger: ${plan.buyerTrigger}`,
    `Current workaround: ${plan.currentWorkaround}`,
    `Customer-side root cause: ${plan.rootCause}`,
    `Business consequence: ${plan.businessConsequence}`,
    `Campaign belief: ${plan.campaignBelief}`,
    `Offer mechanism: ${plan.offerMechanism}`,
    `Desired decision: ${plan.desiredDecision}`,
    `Primary objection: ${plan.primaryObjection}`,
    `Objection response: ${plan.objectionResponse}`,
  ].join("\n");
}

export function formatStrategySemanticPlanIssues(
  issues: StrategySemanticPlanIssue[],
) {
  return issues.length
    ? issues.map((issue, index) => `${index + 1}. ${issue.message}`).join("\n")
    : "No semantic planning issues detected.";
}
