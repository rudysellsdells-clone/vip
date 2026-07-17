import type { CampaignIntelligenceContext } from "../campaign-intelligence.ts";
import type { OneOffPromptCampaign } from "../one-off-campaign-brief.ts";
import {
  formatOfferAuthorityResolution,
  resolvePromotedOffer,
  type AccountOfferCandidate,
} from "./source-authority.ts";
import {
  STRATEGY_ENGINE_V2_VERSION,
  type ResolvedCampaignBrief,
  type ResolvedAudience,
  type VerifiedOfferFacts,
} from "./types.ts";

type UnknownRecord = Record<string, unknown>;
const ROLE_MARKERS = /\b(owner|owners|operator|operators|manager|managers|director|directors|leader|leaders|decision-maker|decision-makers|executive|executives|administrator|administrators|founder|founders|principal|principals)\b/i;
const TRADE_MARKERS = ["contractor", "builder", "painter", "tile", "electrician", "hvac", "plumber", "landscap", "concrete", "tree service", "carpenter", "roof", "home service"];

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clean(value: unknown, maxLength = 1600) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}
function recordValue(record: unknown, keys: string[], maxLength = 1400) {
  if (!isRecord(record)) return "";
  for (const key of keys) {
    const value = clean(record[key], maxLength);
    if (value) return value;
  }
  return "";
}
function listValues(value: unknown, maxItems = 6) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const output: string[] = [];
  for (const item of values) {
    if (typeof item === "string" || typeof item === "number") {
      const text = clean(item, 600);
      if (text) output.push(text);
    } else if (isRecord(item)) {
      const text = recordValue(item, ["value", "text", "label", "name", "description"], 600);
      if (text) output.push(text);
    }
  }
  const seen = new Set<string>();
  return output.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, maxItems);
}
function recordList(record: unknown, keys: string[], maxItems = 6) {
  if (!isRecord(record)) return [];
  for (const key of keys) {
    const values = listValues(record[key], maxItems);
    if (values.length) return values;
  }
  return [];
}
function strategyValue(campaign: OneOffPromptCampaign, key: string) {
  const value = campaign.strategy?.[key];
  return typeof value === "string" ? clean(value, 1800) : "";
}
function separatorCount(value: string) { return (value.match(/[,;|/]/g) ?? []).length; }
function tradeMatchCount(value: string) {
  const normalized = value.toLowerCase();
  return TRADE_MARKERS.filter((marker) => normalized.includes(marker)).length;
}
function wordCount(value: string) { return clean(value).split(/\s+/).filter(Boolean).length; }

function audienceCategoryFromText(value: string) {
  const text = clean(value).toLowerCase();
  if (!text) return "";
  if (tradeMatchCount(text) >= 2 || /\b(home service|construction trade|building contractor)\b/.test(text)) return "Owners and operators of small-to-midsized home-service contracting businesses";
  if (/^contractors?$/.test(text) || /\bcontracting businesses?\b/.test(text)) return "Owners and operators of small-to-midsized contracting businesses";
  if (/\bdent(al|ist|ists|istry)\b/.test(text)) return "Dental practice owners and practice managers responsible for practice growth";
  if (/\bpool service|pool compan|pool contractor/.test(text)) return "Owners and operators of independent pool service companies";
  if (/\blandscap|lawn care|lawn service/.test(text)) return "Owners and operators of landscaping and lawn-care companies";
  if (/\bmanufactur|industrial/.test(text)) return "Commercial and marketing leaders at small-to-midsized manufacturing companies";
  if (/\bhealthcare|medical practice|clinic/.test(text)) return "Owners and operational leaders of independent healthcare practices";
  if (/\be-?commerce|retail/.test(text)) return "Business leaders responsible for e-commerce and digital revenue growth";
  return "";
}
function normalizeAudienceLabel(value: string) {
  const text = clean(value, 800).replace(/[.!?;:,]+$/, "");
  if (!text) return "";
  const mapped = audienceCategoryFromText(text);
  if (mapped) return mapped;
  if (ROLE_MARKERS.test(text) && wordCount(text) <= 42) return text;
  const looksLikeList = text.includes("|") || separatorCount(text) >= 4 || tradeMatchCount(text) >= 4 || wordCount(text) > 55;
  if (looksLikeList) {
    const first = text.split(/[,;|/]/)[0]?.trim();
    const mappedFirst = first ? audienceCategoryFromText(first) : "";
    if (mappedFirst) return mappedFirst;
  }
  if (wordCount(text) <= 14 && separatorCount(text) <= 1) {
    if (/\b(contractor|business|company|practice|agency|firm|manufacturer|retailer)s?\b/i.test(text)) return `Owners and decision-makers at ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    return text;
  }
  return "";
}
function resolveAudience(campaign: OneOffPromptCampaign, intelligence: CampaignIntelligenceContext): ResolvedAudience {
  const buyer = intelligence.selectedBuyerSegments[0];
  const candidates = [campaign.audience, campaign.buyer_segment, recordValue(buyer, ["name", "title", "label"], 400), recordValue(buyer, ["description", "summary"], 1000)].map((item) => clean(item, 1200)).filter(Boolean);
  let label = "";
  for (const candidate of candidates) {
    label = normalizeAudienceLabel(candidate);
    if (label) break;
  }
  if (!label) label = "The primary business decision-maker responsible for the campaign outcome";
  return {
    label,
    buyerDescription: recordValue(buyer, ["description", "summary"], 1200),
    painSignals: recordList(buyer, ["common_pains", "pain_points", "pains"], 6),
    desiredOutcomes: recordList(buyer, ["desired_outcomes", "outcomes", "goals"], 6),
    objections: recordList(buyer, ["objections", "common_objections"], 6),
  };
}
function accountOfferCandidate(record: unknown): AccountOfferCandidate | null {
  if (!isRecord(record)) return null;
  const name = recordValue(record, ["name", "title", "label"], 400);
  if (!name) return null;
  return {
    name,
    description: recordValue(record, ["description", "summary"], 1600),
    outcome: recordValue(record, ["primary_outcome", "outcome", "result"], 1000),
    offerType: recordValue(record, ["offer_type", "type"], 300),
    primaryCta: recordValue(record, ["primary_cta", "cta"], 500),
    priceNotes: recordValue(record, ["price_notes", "pricing_notes", "price"], 700),
  };
}
function extractExplicitDeliverables(description: string) {
  const text = clean(description, 1800);
  if (!text) return [];
  const output: string[] = [];
  const pattern = /(?:deliverables?|includes?|what you (?:get|receive)|you receive|package includes)\s*:\s*([^\n.]+)/gi;
  for (const match of text.matchAll(pattern)) {
    if (!match[1]) continue;
    output.push(...match[1].split(/[,;]+/).map((item) => clean(item, 400)).filter(Boolean));
  }
  return Array.from(new Set(output.map((item) => item.toLowerCase()))).map((normalized) => output.find((item) => item.toLowerCase() === normalized) ?? normalized).slice(0, 8);
}
function verifiedOfferFacts(candidate: AccountOfferCandidate | null, compatible: boolean): VerifiedOfferFacts {
  if (!candidate || !compatible) return { name: "", description: "", outcome: "", type: "", priceNotes: "", cta: "", deliverables: [] };
  return {
    name: candidate.name,
    description: candidate.description,
    outcome: candidate.outcome,
    type: candidate.offerType,
    priceNotes: candidate.priceNotes,
    cta: candidate.primaryCta,
    deliverables: extractExplicitDeliverables(candidate.description),
  };
}

export function resolveCampaignBrief({ campaign, intelligence }: { campaign: OneOffPromptCampaign; intelligence: CampaignIntelligenceContext }): ResolvedCampaignBrief {
  const selectedOfferCandidate = accountOfferCandidate(intelligence.selectedOffers[0]);
  const promotedOffer = resolvePromotedOffer({
    campaignOffer: clean(campaign.promoted_offer ?? strategyValue(campaign, "promotedOffer"), 600),
    campaignCta: clean(campaign.cta, 500),
    campaignGoal: clean(campaign.goal, 900),
    campaignTopic: clean(campaign.idea, 1400),
    selectedAccountOffer: selectedOfferCandidate,
  });
  const service = intelligence.selectedServiceLines[0];
  const audience = resolveAudience(campaign, intelligence);
  const approvedProof = [strategyValue(campaign, "proofPoints")].filter(Boolean);
  const verified = verifiedOfferFacts(selectedOfferCandidate, promotedOffer.selectedAccountOfferCompatible || promotedOffer.source === "selected_account_offer");
  return {
    version: STRATEGY_ENGINE_V2_VERSION,
    campaignName: clean(campaign.name, 400),
    campaignTopic: clean(campaign.idea, 1600),
    campaignGoal: clean(campaign.goal, 1000),
    primaryCta: clean(campaign.cta, 500) || verified.cta,
    tone: clean(campaign.tone, 250) || "Clear, practical, confident",
    platforms: (campaign.platforms ?? []).map((item) => clean(item, 100)).filter(Boolean),
    audience,
    promotedOffer,
    verifiedOfferFacts: verified,
    relatedService: {
      name: recordValue(service, ["name", "title", "label"], 400),
      description: recordValue(service, ["description", "summary"], 1400),
      outcome: recordValue(service, ["primary_outcome", "outcome", "result"], 900),
    },
    approvedProof,
    internalGuidance: {
      differentiator: strategyValue(campaign, "differentiator"),
      originalityAngle: strategyValue(campaign, "originalityAngle"),
      objections: strategyValue(campaign, "objections"),
      creatorNotes: clean(campaign.notes, 1800),
    },
    resolutionWarnings: promotedOffer.conflicts.map((conflict) => conflict.message),
  };
}
function displayList(values: string[]) { return values.length ? values.map((item) => `- ${item}`).join("\n") : "- Not specifically established"; }
export function formatResolvedCampaignBrief(brief: ResolvedCampaignBrief) {
  return [
    `## Canonical Campaign Brief — ${brief.version}`,
    "This is the only source of truth for strategy generation. Do not import, infer, or resurrect offers, audiences, deliverables, or proof that do not appear here.",
    "", "### Resolved authority", formatOfferAuthorityResolution(brief.promotedOffer),
    "", "### Customer", `Primary decision-maker: ${brief.audience.label}`, `Buyer description: ${brief.audience.buyerDescription || "Not specifically established"}`,
    "Customer pain signals:", displayList(brief.audience.painSignals), "Customer desired outcomes:", displayList(brief.audience.desiredOutcomes), "Customer objections:", displayList(brief.audience.objections),
    "", "### Campaign intent", `Campaign name: ${brief.campaignName}`, `Topic or idea: ${brief.campaignTopic}`, `Goal: ${brief.campaignGoal}`, `Primary CTA: ${brief.primaryCta}`, `Tone: ${brief.tone}`, `Channels: ${brief.platforms.join(", ") || "Not specifically established"}`,
    "", "### Verified offer facts", `Promoted offer: ${brief.promotedOffer.name}`, `Verified saved-offer name: ${brief.verifiedOfferFacts.name || "None"}`, `Verified description: ${brief.verifiedOfferFacts.description || "Not specifically established"}`, `Verified outcome: ${brief.verifiedOfferFacts.outcome || "Not specifically established"}`, `Verified type: ${brief.verifiedOfferFacts.type || "Not specifically established"}`, `Verified price/package note: ${brief.verifiedOfferFacts.priceNotes || "Not specifically established"}`, "Verified deliverables:", displayList(brief.verifiedOfferFacts.deliverables),
    "", "### Approved proof", displayList(brief.approvedProof),
    "", "### Internal guidance — interpret, never quote", `Differentiator: ${brief.internalGuidance.differentiator || "Not specifically established"}`, `Originality angle: ${brief.internalGuidance.originalityAngle || "Not specifically established"}`, `Creator objections: ${brief.internalGuidance.objections || "Not specifically established"}`, `Creator notes: ${brief.internalGuidance.creatorNotes || "Not specifically established"}`,
  ].join("\n");
}
export function blockingBriefConflicts(brief: ResolvedCampaignBrief) { return brief.promotedOffer.conflicts.filter((conflict) => conflict.severity === "blocking"); }
export function formatResolvedCampaignFactsForAssets(brief: ResolvedCampaignBrief) {
  return [
    `## Resolved Campaign Facts — ${brief.version}`,
    "Use only these facts alongside the approved Marketing Spine. Do not reintroduce ignored account offers or raw account settings.",
    `- Promoted offer: ${brief.promotedOffer.name}`,
    `- Offer category: ${brief.promotedOffer.category}`,
    `- Primary CTA: ${brief.primaryCta}`,
    `- Primary audience: ${brief.audience.label}`,
    ...(brief.verifiedOfferFacts.description ? [`- Verified offer description: ${brief.verifiedOfferFacts.description}`] : []),
    ...(brief.verifiedOfferFacts.outcome ? [`- Verified offer outcome: ${brief.verifiedOfferFacts.outcome}`] : []),
    ...(brief.verifiedOfferFacts.deliverables.length ? brief.verifiedOfferFacts.deliverables.map((item) => `- Verified deliverable: ${item}`) : ["- Verified deliverables: none specifically established beyond the promoted offer itself."]),
    ...(brief.approvedProof.length ? brief.approvedProof.map((item) => `- Approved proof: ${item}`) : ["- Approved proof: none supplied."]),
    ...(brief.promotedOffer.ignoredOfferNames.length ? [`- Explicitly excluded offers: ${brief.promotedOffer.ignoredOfferNames.join(", ")}. Do not mention or imply them.`] : []),
  ].join("\n");
}
