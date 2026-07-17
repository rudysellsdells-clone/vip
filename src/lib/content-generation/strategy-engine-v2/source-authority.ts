import type {
  OfferAuthoritySource,
  OfferCategory,
  ResolvedOffer,
  StrategySourceConflict,
} from "./types.ts";

export type AccountOfferCandidate = {
  name: string;
  description: string;
  outcome: string;
  offerType: string;
  primaryCta: string;
  priceNotes: string;
};

type ResolveOfferInput = {
  campaignOffer: string;
  campaignCta: string;
  campaignGoal: string;
  campaignTopic: string;
  selectedAccountOffer: AccountOfferCandidate | null;
};

const GENERIC_OFFER_TOKENS = new Set([
  "a", "an", "and", "book", "business", "call", "company", "for", "free",
  "get", "marketing", "our", "request", "schedule", "service", "session",
  "the", "to", "your",
]);

const CATEGORY_TERMS: Record<OfferCategory, string[]> = {
  demo: ["demo", "demonstration", "walkthrough", "showcase"],
  audit: ["audit", "assessment", "diagnostic", "review", "report", "findings"],
  consultation: ["consultation", "consult", "strategy call", "discovery call", "advisory"],
  webinar: ["webinar", "workshop", "seminar", "class", "training"],
  guide: ["guide", "checklist", "playbook", "ebook", "download", "template"],
  trial: ["trial", "pilot", "test drive", "proof of concept"],
  product: ["product", "platform", "software", "subscription"],
  service: ["service", "project", "retainer", "implementation"],
  informational: ["information", "learn", "awareness", "educational"],
  unknown: [],
};

function clean(value: unknown, maxLength = 1200) {
  const text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function stripActionPrefix(value: string) {
  return clean(value)
    .replace(
      /^(?:please\s+)?(?:schedule|book|request|get|download|register(?:\s+for)?|join|watch|see|try|start|explore|reserve|claim|contact|call|learn\s+about|sign\s+up\s+for)\s+/i,
      "",
    )
    .replace(/^(?:a|an|the|your|our)\s+/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function normalizeName(value: string) {
  return clean(value)
    .replace(/\s+/g, " ")
    .replace(/[.!?;:,]+$/, "")
    .trim();
}

function tokens(value: string) {
  return Array.from(
    new Set(
      clean(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((token) => token.replace(/^-+|-+$/g, ""))
        .filter((token) => token.length >= 3 && !GENERIC_OFFER_TOKENS.has(token)),
    ),
  );
}

function tokenOverlap(left: string, right: string) {
  const leftTokens = tokens(left);
  const rightTokens = new Set(tokens(right));
  if (!leftTokens.length || !rightTokens.size) return 0;
  const overlap = leftTokens.filter((token) => rightTokens.has(token)).length;
  return overlap / Math.min(leftTokens.length, rightTokens.size);
}

export function classifyOffer(value: string): OfferCategory {
  const normalized = clean(value).toLowerCase();
  if (!normalized) return "unknown";
  const order: OfferCategory[] = [
    "demo", "audit", "consultation", "webinar", "guide", "trial",
    "informational", "product", "service",
  ];
  for (const category of order) {
    if (CATEGORY_TERMS[category].some((term) => normalized.includes(term))) {
      return category;
    }
  }
  return "unknown";
}

export function extractOfferFromCta(cta: string) {
  const candidate = stripActionPrefix(cta);
  if (!candidate || candidate.length < 3) return "";
  if (/^(call|contact|learn more|start|continue|submit|click here)$/i.test(candidate)) return "";
  return candidate;
}

function extractOfferFromGoal(goal: string) {
  const text = clean(goal);
  if (!text) return "";
  const direct = text.match(
    /(?:generate|increase|drive|create|book|secure|produce)\s+(?:qualified\s+)?(?:requests?|appointments?|registrations?|signups?|leads?)\s+(?:for|to)\s+(.+)/i,
  );
  if (direct?.[1]) return normalizeName(direct[1]);
  if (/\bdemo requests?\b/i.test(text)) return "Demo";
  if (/\baudit (?:calls?|requests?|bookings?)\b/i.test(text)) return "Audit";
  if (/\bconsultation (?:calls?|requests?|bookings?)\b/i.test(text)) return "Consultation";
  return "";
}

function categoryConflict(left: OfferCategory, right: OfferCategory) {
  if (left === "unknown" || right === "unknown" || left === right) return false;
  const soft = new Set<OfferCategory>(["product", "service"]);
  return !soft.has(left) && !soft.has(right);
}

export function offersAreCompatible(left: string, right: string) {
  const cleanLeft = normalizeName(left);
  const cleanRight = normalizeName(right);
  if (!cleanLeft || !cleanRight) return false;
  if (cleanLeft.toLowerCase() === cleanRight.toLowerCase()) return true;
  const leftCategory = classifyOffer(cleanLeft);
  const rightCategory = classifyOffer(cleanRight);
  if (categoryConflict(leftCategory, rightCategory)) return false;
  return tokenOverlap(cleanLeft, cleanRight) >= 0.45;
}

function authorityCandidate(input: ResolveOfferInput): { name: string; source: OfferAuthoritySource } {
  const campaignOffer = normalizeName(input.campaignOffer);
  if (campaignOffer) return { name: campaignOffer, source: "campaign_offer" };
  const selectedOffer = normalizeName(input.selectedAccountOffer?.name ?? "");
  if (selectedOffer) return { name: selectedOffer, source: "selected_account_offer" };
  const ctaOffer = normalizeName(extractOfferFromCta(input.campaignCta));
  if (ctaOffer) return { name: ctaOffer, source: "campaign_cta" };
  const goalOffer = normalizeName(extractOfferFromGoal(input.campaignGoal));
  if (goalOffer) return { name: goalOffer, source: "campaign_goal" };
  const topicCategory = classifyOffer(input.campaignTopic);
  if (topicCategory !== "unknown") {
    return { name: normalizeName(input.campaignTopic), source: "campaign_topic" };
  }
  return { name: "Informational campaign with no direct offer", source: "informational" };
}

function forbiddenTermsForConflict(
  winnerCategory: OfferCategory,
  ignoredCategory: OfferCategory,
  ignoredName: string,
) {
  const terms = new Set<string>();
  const normalizedName = normalizeName(ignoredName).toLowerCase();
  if (normalizedName.length >= 4) terms.add(normalizedName);
  if (categoryConflict(winnerCategory, ignoredCategory)) {
    for (const term of CATEGORY_TERMS[ignoredCategory]) {
      if (term.length >= 4) terms.add(term);
    }
  }
  return Array.from(terms);
}

export function resolvePromotedOffer(input: ResolveOfferInput): ResolvedOffer {
  const winner = authorityCandidate(input);
  const winnerCategory = classifyOffer(winner.name);
  const selectedName = normalizeName(input.selectedAccountOffer?.name ?? "");
  const conflicts: StrategySourceConflict[] = [];
  const ignoredOfferNames: string[] = [];
  const forbiddenTerms = new Set<string>();
  let selectedAccountOfferCompatible = false;

  if (selectedName) {
    selectedAccountOfferCompatible = offersAreCompatible(winner.name, selectedName);
    if (!selectedAccountOfferCompatible && winner.source !== "selected_account_offer") {
      ignoredOfferNames.push(selectedName);
      const ignoredCategory = classifyOffer(selectedName);
      for (const term of forbiddenTermsForConflict(winnerCategory, ignoredCategory, selectedName)) {
        forbiddenTerms.add(term);
      }
      conflicts.push({
        code: "campaign_offer_overrides_selected_account_offer",
        severity: "warning",
        message: `The campaign promotes “${winner.name},” so the conflicting saved offer “${selectedName}” was excluded from strategy generation.`,
        winningSource: winner.source,
        ignoredSource: "selected_account_offer",
      });
    }
  }

  const ctaOffer = normalizeName(extractOfferFromCta(input.campaignCta));
  if (ctaOffer && winner.source === "campaign_offer" && !offersAreCompatible(winner.name, ctaOffer)) {
    conflicts.push({
      code: "campaign_offer_cta_conflict",
      severity: "blocking",
      message: `Campaign Offer is “${winner.name},” but the CTA appears to promote “${ctaOffer}.” Align those two fields before generating the strategy.`,
      winningSource: "campaign_offer",
      ignoredSource: "campaign_cta",
    });
  }

  return {
    name: winner.name,
    category: winnerCategory,
    source: winner.source,
    selectedAccountOfferName: selectedName || null,
    selectedAccountOfferCompatible,
    ignoredOfferNames,
    forbiddenTerms: Array.from(forbiddenTerms),
    conflicts,
  };
}

export function formatOfferAuthorityResolution(offer: ResolvedOffer) {
  return [
    `Promoted offer: ${offer.name}`,
    `Offer authority source: ${offer.source}`,
    `Offer category: ${offer.category}`,
    `Selected account offer: ${offer.selectedAccountOfferName ?? "None"}`,
    `Selected account offer usable: ${offer.selectedAccountOfferCompatible ? "Yes" : "No"}`,
    `Ignored offers: ${offer.ignoredOfferNames.length ? offer.ignoredOfferNames.join(", ") : "None"}`,
    `Forbidden conflicting terms: ${offer.forbiddenTerms.length ? offer.forbiddenTerms.join(", ") : "None"}`,
  ].join("\n");
}
