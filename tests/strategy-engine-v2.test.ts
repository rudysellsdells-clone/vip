import assert from "node:assert/strict";
import test from "node:test";

import {
  blockingBriefConflicts,
  resolveCampaignBrief,
} from "../src/lib/content-generation/strategy-engine-v2/campaign-brief-resolver.ts";
import { STRATEGY_FIELD_CONTRACTS } from "../src/lib/content-generation/strategy-engine-v2/field-contracts.ts";
import {
  buildDeterministicStrategy,
} from "../src/lib/content-generation/strategy-engine-v2/strategy-fallbacks.ts";
import {
  criticalStrategyIssues,
  validateStrategy,
} from "../src/lib/content-generation/strategy-engine-v2/strategy-validator.ts";
import type { OneOffPromptCampaign } from "../src/lib/content-generation/one-off-campaign-brief.ts";
import type { CampaignIntelligenceContext } from "../src/lib/content-generation/campaign-intelligence.ts";

function campaign(overrides: Partial<OneOffPromptCampaign> = {}): OneOffPromptCampaign {
  return {
    name: "Marketing VIP Demo Campaign",
    idea:
      "Show contractors how Marketing VIP plans a campaign and creates connected marketing assets.",
    buyer_segment: "Contractors",
    audience:
      "Builders, painters, tile contractors, electricians, HVAC companies, plumbers, landscapers, concrete companies, tree services, carpenters, and roofers",
    goal: "Generate qualified Marketing VIP demo requests",
    promoted_offer: "Marketing VIP Demo",
    platforms: ["Email", "LinkedIn", "Facebook", "YouTube"],
    tone: "Clear, practical, confident",
    cta: "Schedule a Marketing VIP Demo",
    notes: "Show the platform in a useful, practical way without overselling it.",
    strategy: {
      offerId: "offer-audit",
      differentiator:
        "Marketing VIP connects strategy, content planning, and asset creation in one workflow.",
      proofPoints: "",
      originalityAngle:
        "Contractors should see the system operating, not merely hear another AI claim.",
      objections: "I do not have time to learn another complicated platform.",
      strategyContext: "Selected account offer: Website Audit",
      sourceContext: "Older website audit campaign notes.",
    },
    ...overrides,
  };
}

function intelligence(overrides: Partial<CampaignIntelligenceContext> = {}): CampaignIntelligenceContext {
  const base: CampaignIntelligenceContext = {
    enabled: true,
    brief: {
      audience: { value: "Contractors", confidence: "supported", sources: ["campaign"] },
      decisionMoment: { value: "", confidence: "missing", sources: [] },
      visibleProblem: { value: "", confidence: "missing", sources: [] },
      underlyingProblem: { value: "", confidence: "missing", sources: [] },
      businessConsequence: { value: "", confidence: "missing", sources: [] },
      currentAlternatives: { value: "", confidence: "missing", sources: [] },
      uniquePointOfView: { value: "", confidence: "missing", sources: [] },
      offerMechanism: { value: "", confidence: "missing", sources: [] },
      offerDeliverables: { value: "", confidence: "missing", sources: [] },
      approvedProof: { value: "", confidence: "missing", sources: [] },
      primaryObjection: { value: "", confidence: "missing", sources: [] },
      objectionResponse: { value: "", confidence: "missing", sources: [] },
      desiredConclusion: { value: "", confidence: "missing", sources: [] },
      callToAction: {
        value: "Schedule a Marketing VIP Demo",
        confidence: "supported",
        sources: ["campaign"],
      },
      readinessScore: 50,
      missingElements: [],
    },
    formattedBrief: "",
    formattedContext: "",
    selectedServiceLines: [],
    selectedBuyerSegments: [
      {
        id: "buyer-contractors",
        name: "Contractors",
        description:
          "Owner-led contracting businesses where marketing is handled between sales, operations, and customer work.",
        common_pains: [
          "Marketing is inconsistent because the owner has to manage it alongside the business.",
          "Content and campaigns are created as disconnected one-off tasks.",
        ],
        desired_outcomes: [
          "A dependable marketing system that supports growth without adding a full internal team.",
        ],
        objections: ["I do not have time to learn another complicated platform."],
      },
    ],
    selectedOffers: [
      {
        id: "offer-audit",
        name: "Website Audit",
        description:
          "A website review. Deliverables: two-page findings report; prioritized recommendations.",
        outcome: "Understand the website changes that deserve attention first.",
        offer_type: "Audit",
        primary_cta: "Book a Website Audit",
      },
    ],
    selectedContentExamples: [],
    selectedKnowledgeSources: [],
    selectionSummary: {
      serviceLinesSelected: 0,
      serviceLinesAvailable: 0,
      buyerSegmentsSelected: 1,
      buyerSegmentsAvailable: 1,
      offersSelected: 1,
      offersAvailable: 1,
      contentExamplesSelected: 0,
      contentExamplesAvailable: 0,
      knowledgeSourcesSelected: 0,
      knowledgeSourcesAvailable: 0,
    },
  };
  return { ...base, ...overrides };
}

test("campaign-level Marketing VIP demo overrides a conflicting Website Audit", () => {
  const brief = resolveCampaignBrief({ campaign: campaign(), intelligence: intelligence() });
  assert.equal(brief.promotedOffer.name, "Marketing VIP Demo");
  assert.equal(brief.promotedOffer.source, "campaign_offer");
  assert.deepEqual(brief.promotedOffer.ignoredOfferNames, ["Website Audit"]);
  assert.equal(brief.verifiedOfferFacts.name, "");
  assert.ok(brief.promotedOffer.forbiddenTerms.includes("audit"));
});

test("an aligned explicitly selected Website Audit remains usable", () => {
  const alignedCampaign = campaign({
    name: "Website Audit Campaign",
    idea: "Help contractors understand which website issues are limiting lead generation.",
    goal: "Generate qualified website audit requests",
    promoted_offer: "Website Audit",
    cta: "Book a Website Audit",
  });
  const brief = resolveCampaignBrief({ campaign: alignedCampaign, intelligence: intelligence() });
  assert.equal(brief.promotedOffer.name, "Website Audit");
  assert.equal(brief.promotedOffer.selectedAccountOfferCompatible, true);
  assert.equal(brief.verifiedOfferFacts.name, "Website Audit");
  assert.deepEqual(brief.verifiedOfferFacts.deliverables, [
    "two-page findings report",
    "prioritized recommendations",
  ]);
});

test("a long contractor market list resolves to one decision-maker category", () => {
  const brief = resolveCampaignBrief({ campaign: campaign(), intelligence: intelligence() });
  assert.equal(
    brief.audience.label,
    "Owners and operators of small-to-midsized home-service contracting businesses",
  );
  assert.equal(brief.audience.label.includes("painters"), false);
});

test("a campaign offer and CTA conflict blocks strategy generation", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign({ cta: "Book a Website Audit" }),
    intelligence: intelligence(),
  });
  const conflicts = blockingBriefConflicts(brief);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0]?.code, "campaign_offer_cta_conflict");
});

test("ignored offer terms are rejected anywhere in the strategy", () => {
  const brief = resolveCampaignBrief({ campaign: campaign(), intelligence: intelligence() });
  const strategy = buildDeterministicStrategy(brief);
  strategy.offerExplanation =
    "The website audit reviews the current website and produces a clear report before the buyer schedules a demo.";
  const issues = validateStrategy({ strategy, brief });
  assert.ok(issues.some((issue) => issue.code.includes("ignored_offer_reintroduced")));
});

test("missing proof produces an honest no-proof statement", () => {
  const brief = resolveCampaignBrief({ campaign: campaign(), intelligence: intelligence() });
  const strategy = buildDeterministicStrategy(brief);
  assert.match(strategy.proofAndSupport, /No approved quantitative proof/i);
  assert.equal(validateStrategy({ strategy, brief }).some((issue) => issue.code === "unsupported_proof"), false);
});

test("a demo does not invent an audit report or roadmap", () => {
  const brief = resolveCampaignBrief({ campaign: campaign(), intelligence: intelligence() });
  const strategy = buildDeterministicStrategy(brief);
  assert.match(strategy.offerDeliverables, /demonstration/i);
  assert.doesNotMatch(strategy.offerDeliverables, /audit|report|roadmap|assessment/i);
});

test("customer problem fields stay customer-centered", () => {
  const brief = resolveCampaignBrief({ campaign: campaign(), intelligence: intelligence() });
  const strategy = buildDeterministicStrategy(brief);
  assert.doesNotMatch(strategy.buyerSituation, /our issue|campaign creator|web search professionals/i);
  assert.doesNotMatch(strategy.coreProblem, /our issue|campaign creator|web search professionals|marketing vip/i);
  assert.doesNotMatch(strategy.businessConsequence, /our issue|campaign creator|web search professionals/i);
});

test("dental audience resolution selects practice decision-makers", () => {
  const dentalCampaign = campaign({
    audience: "Dentists and dental practices",
    buyer_segment: "Dental Practices",
  });
  const brief = resolveCampaignBrief({ campaign: dentalCampaign, intelligence: intelligence() });
  assert.equal(
    brief.audience.label,
    "Dental practice owners and practice managers responsible for practice growth",
  );
});

test("an informational campaign can explicitly avoid a direct offer", () => {
  const infoCampaign = campaign({
    promoted_offer: "Informational campaign with no direct offer",
    goal: "Educate contractors about the cost of fragmented marketing",
    cta: "Read the full article",
  });
  const brief = resolveCampaignBrief({ campaign: infoCampaign, intelligence: intelligence({ selectedOffers: [] }) });
  assert.equal(brief.promotedOffer.category, "informational");
  assert.equal(brief.promotedOffer.source, "campaign_offer");
});

test("all thirteen field contracts exist and the deterministic spine has no critical issues", () => {
  assert.equal(Object.keys(STRATEGY_FIELD_CONTRACTS).length, 13);
  const brief = resolveCampaignBrief({ campaign: campaign(), intelligence: intelligence() });
  const strategy = buildDeterministicStrategy(brief);
  const issues = validateStrategy({ strategy, brief });
  assert.deepEqual(criticalStrategyIssues(issues), []);
});

test("validator catches vendor-centered problems and CTA drift", () => {
  const brief = resolveCampaignBrief({ campaign: campaign(), intelligence: intelligence() });
  const strategy = buildDeterministicStrategy(brief);
  strategy.coreProblem =
    "Marketing VIP needs the customer to understand our platform because our company wants more demonstrations and stronger campaign results.";
  strategy.primaryCta = "Download the Website Audit";
  const issues = validateStrategy({ strategy, brief });
  assert.ok(issues.some((issue) => issue.code === "core_problem_not_customer_cause"));
  assert.ok(issues.some((issue) => issue.code === "cta_drift"));
  assert.ok(issues.some((issue) => issue.code.includes("ignored_offer_reintroduced")));
});

test("channel direction covers every selected platform", () => {
  const brief = resolveCampaignBrief({ campaign: campaign(), intelligence: intelligence() });
  const strategy = buildDeterministicStrategy(brief);
  for (const platform of brief.platforms) {
    assert.match(strategy.contentDirection.toLowerCase(), new RegExp(platform.toLowerCase()));
  }
  assert.equal(validateStrategy({ strategy, brief }).some((issue) => issue.code === "channel_missing"), false);
});
