import assert from "node:assert/strict";
import test from "node:test";

import { buildBrandVoiceMonthlyOptions } from "../src/lib/accounts/brand-voice-monthly-options.ts";

import {
  blockingBriefConflicts,
  resolveCampaignBrief,
} from "../src/lib/content-generation/strategy-engine-v2/campaign-brief-resolver.ts";
import {
  StrategyQualityGateError,
  strategyQualityGateMessage,
} from "../src/lib/content-generation/strategy-engine-v2/errors.ts";
import { STRATEGY_FIELD_CONTRACTS } from "../src/lib/content-generation/strategy-engine-v2/field-contracts.ts";
import {
  parseSafeOpenAiError,
  shouldTryNextStrategyModel,
  strategyModelCandidates,
} from "../src/lib/content-generation/strategy-engine-v2/openai-stage-config.ts";
import {
  normalizeStrategySemanticPlan,
  validateStrategySemanticPlan,
} from "../src/lib/content-generation/strategy-engine-v2/semantic-plan.ts";
import { buildDeterministicStrategy } from "../src/lib/content-generation/strategy-engine-v2/strategy-fallbacks.ts";
import { validateStrategy } from "../src/lib/content-generation/strategy-engine-v2/strategy-validator.ts";
import type { OneOffPromptCampaign } from "../src/lib/content-generation/one-off-campaign-brief.ts";
import type { CampaignIntelligenceContext } from "../src/lib/content-generation/campaign-intelligence.ts";
import type {
  StrategySemanticPlan,
} from "../src/lib/content-generation/strategy-engine-v2/types.ts";
import type { OneOffCampaignStrategy } from "../src/lib/content-generation/one-off-strategy-gate.ts";

function campaign(
  overrides: Partial<OneOffPromptCampaign> = {},
): OneOffPromptCampaign {
  return {
    name: "Marketing VIP Demo Campaign",
    idea:
      "Show contractors how Marketing VIP can provide consistent campaign planning and content creation without requiring a full internal marketing team.",
    buyer_segment: "Contractors",
    audience:
      "Builders, painters, tile contractors, electricians, HVAC companies, plumbers, landscapers, concrete companies, tree services, carpenters, and roofers",
    goal: "Generate qualified Marketing VIP demo requests",
    promoted_offer: "Marketing VIP Demo",
    platforms: ["Email", "LinkedIn", "Facebook", "YouTube"],
    tone: "Clear, practical, confident",
    cta: "Schedule a Marketing VIP Demo",
    notes:
      "Show the platform in a useful, practical way without overselling it.",
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

function intelligence(
  overrides: Partial<CampaignIntelligenceContext> = {},
): CampaignIntelligenceContext {
  const base: CampaignIntelligenceContext = {
    enabled: true,
    brief: {
      audience: {
        value: "Contractors",
        confidence: "supported",
        sources: ["campaign"],
      },
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

function approvedPlan(): StrategySemanticPlan {
  return {
    buyerTrigger:
      "The owner wants a steadier flow of future work but realizes marketing disappears whenever customer and operational demands become urgent.",
    currentWorkaround:
      "The company relies on referrals, occasional social posts, and outside help purchased only when the pipeline begins to feel uncertain.",
    rootCause:
      "Because no one owns a repeatable marketing process, planning and production compete with estimating, staffing, customer service, and daily operations for the owner's limited attention.",
    businessConsequence:
      "Visibility and lead generation remain unpredictable, so the company cannot build demand early and growth continues to depend heavily on referrals and the owner's personal effort.",
    campaignBelief:
      "Consistent marketing does not require hiring a full internal department; it requires a dependable way to turn business priorities into coordinated campaigns and usable content.",
    offerMechanism:
      "The Marketing VIP Demo shows how the platform uses a company's audience, services, goals, and brand direction to organize strategy, campaign planning, and content creation in one workflow.",
    desiredDecision:
      "The qualified owner decides whether to schedule a Marketing VIP demo and evaluate the platform as an alternative to building a full-time marketing team.",
    primaryObjection:
      "The owner worries that another marketing platform will require more time and management than the business can spare.",
    objectionResponse:
      "The demonstration should focus on the actual workflow and decision value, allowing the owner to judge usability and fit without making an immediate commitment.",
  };
}

function approvedStrategy(): OneOffCampaignStrategy {
  return {
    campaignObjective:
      "Persuade contracting business owners that consistent marketing can be achieved without building a full internal team, and encourage qualified prospects to schedule a Marketing VIP demo.",
    targetAudience:
      "Owners and operators of small-to-midsized home-service contracting businesses who are responsible for growth and marketing decisions.",
    buyerSituation:
      "Marketing competes with estimates, customers, employees, and daily operations for the owner's attention. The company still relies on referrals, occasional social posts, or outside help purchased when demand slows. The issue becomes urgent when the owner wants steadier growth but cannot justify or manage a full-time marketing hire.",
    coreProblem:
      "The business lacks dedicated marketing capacity because no one owns a repeatable process for turning growth priorities into planned campaigns and finished content. Marketing therefore depends on whatever time and attention the owner can spare.",
    businessConsequence:
      "Without consistent planning and production, visibility and lead generation remain unpredictable. The company risks waiting until demand weakens before marketing again, making growth harder to manage and keeping future work dependent on referrals and the owner's personal effort.",
    campaignPointOfView:
      "Consistent marketing does not require a full internal department. Rather than adding disconnected tools or occasional projects, contractors need one dependable workflow that connects business priorities, campaign planning, and content production.",
    offerExplanation:
      "A Marketing VIP demo shows how the platform uses the company's audience, services, goals, and brand direction to organize strategy, campaign planning, and content creation. The owner can evaluate the workflow, practical fit, and potential value before deciding whether to move forward.",
    offerDeliverables:
      "The verified deliverable is the Marketing VIP demonstration itself, which allows the owner to review the workflow and decide whether the platform warrants further consideration.",
    proofAndSupport:
      "No approved quantitative proof, testimonial, case study, or verified performance claim was supplied. The campaign should rely on clear reasoning and an accurate demonstration of the platform.",
    objectionsAndResponse:
      "A likely concern is that another platform will require more time and management than the business can spare. The demo should answer this by showing the actual workflow clearly, allowing the owner to judge usability and fit without pressure.",
    messageProgression:
      "Begin with the owner's struggle to market consistently while running the business. Explain why referrals and occasional activity do not create dependable demand, then show the cost of waiting until work slows. Introduce the belief that consistent marketing does not require a full internal team, demonstrate how Marketing VIP supports that approach, answer the time-and-complexity concern, and close by inviting the owner to schedule a demo.",
    primaryCta: "Schedule a Marketing VIP Demo",
    contentDirection:
      "Email: connect the owner's time constraint to one practical reason to schedule the demo. LinkedIn: lead with the business case for consistent marketing without a full internal team. Facebook: use a familiar contractor scenario and a low-pressure invitation. YouTube: show the workflow visually and end with the Marketing VIP demo CTA.",
  };
}

test("campaign-level Marketing VIP demo overrides a conflicting Website Audit", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
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
  const brief = resolveCampaignBrief({
    campaign: alignedCampaign,
    intelligence: intelligence(),
  });
  assert.equal(brief.promotedOffer.name, "Website Audit");
  assert.equal(brief.promotedOffer.selectedAccountOfferCompatible, true);
  assert.equal(brief.verifiedOfferFacts.name, "Website Audit");
  assert.deepEqual(brief.verifiedOfferFacts.deliverables, [
    "two-page findings report",
    "prioritized recommendations",
  ]);
});

test("a long contractor market list resolves to one decision-maker category", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
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

test("semantic planning accepts customer-specific reasoning", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
  const plan = normalizeStrategySemanticPlan(approvedPlan());
  assert.deepEqual(validateStrategySemanticPlan({ plan, brief }), []);
});

test("semantic planning rejects stitched campaign fragments", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
  const plan = approvedPlan();
  plan.buyerTrigger =
    "The owners are trying to easy marketing that works for them while running the business every day.";
  const issues = validateStrategySemanticPlan({ plan, brief });
  assert.ok(issues.some((issue) => issue.code === "awkward_plan_language"));
});

test("quality validator accepts a natural contractor strategy", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
  assert.deepEqual(validateStrategy({ strategy: approvedStrategy(), brief }), []);
});

test("quality validator rejects the exact H1.9 fallback language", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
  const strategy = approvedStrategy();
  strategy.campaignObjective =
    "Move owners and operators of small-to-midsized home-service contracting businesses from recognizing that fragmented execution is limiting progress to viewing Book a Demo as the practical next step for evaluating Demo.";
  strategy.buyerSituation =
    "When owners are trying to easy marketing that works for them but still rely on reactive, disconnected, or one-off efforts, the workaround may keep activity moving, but it no longer provides a dependable path for deciding what should happen next.";
  strategy.coreProblem =
    "The underlying problem stems from the lack of a repeatable system for connecting the buyer's decisions and day-to-day actions to the desired business outcome.";

  const issues = validateStrategy({ strategy, brief });
  assert.ok(issues.some((issue) => issue.code === "generic_fallback_template"));
  assert.ok(issues.some((issue) => issue.code === "malformed_language"));
});

test("ignored offer terms are rejected anywhere in the strategy", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
  const strategy = approvedStrategy();
  strategy.offerExplanation =
    "The website audit reviews the current website before the owner schedules a Marketing VIP demo.";
  const issues = validateStrategy({ strategy, brief });
  assert.ok(
    issues.some((issue) => issue.code.includes("ignored_offer_reintroduced")),
  );
});

test("missing proof requires an honest no-proof statement", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
  const strategy = approvedStrategy();
  strategy.proofAndSupport =
    "The platform has repeatedly produced excellent results for businesses like these.";
  const issues = validateStrategy({ strategy, brief });
  assert.ok(issues.some((issue) => issue.code === "unsupported_proof"));
});

test("a demo cannot invent an audit report or roadmap", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
  const strategy = approvedStrategy();
  strategy.offerDeliverables =
    "The buyer receives a detailed roadmap and written assessment after the Marketing VIP demonstration.";
  const issues = validateStrategy({ strategy, brief });
  assert.ok(issues.some((issue) => issue.code === "invented_deliverable"));
});

test("narrative fallback generation is disabled", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
  assert.throws(
    () => buildDeterministicStrategy(brief),
    (error: unknown) =>
      error instanceof StrategyQualityGateError &&
      error.code === "STRATEGY_QUALITY_GATE",
  );
});

test("quality-gate errors preserve safe failure diagnostics", () => {
  const error = new StrategyQualityGateError({
    stage: "final_validation",
    message: strategyQualityGateMessage("final_validation"),
    diagnostic: {
      requestStatus: "completed",
      completedStages: ["planning", "strategy", "quality_review"],
      blockingIssues: ["buyerSituation: The sentence is malformed."],
      advisoryIssues: ["campaignObjective: The field is slightly long."],
      reviewApproved: true,
      reviewIssues: ["Tighten one sentence."],
    },
  });

  assert.equal(error.code, "STRATEGY_QUALITY_GATE");
  assert.equal(error.diagnostic.stage, "final_validation");
  assert.equal(error.diagnostic.requestStatus, "completed");
  assert.equal(error.diagnostic.reviewApproved, true);
  assert.deepEqual(error.diagnostic.completedStages, [
    "planning",
    "strategy",
    "quality_review",
  ]);
  assert.equal(error.diagnostic.blockingIssues.length, 1);
  assert.equal(error.diagnostic.advisoryIssues.length, 1);
});

test("all thirteen field contracts remain present", () => {
  assert.equal(Object.keys(STRATEGY_FIELD_CONTRACTS).length, 13);
});

test("channel direction covers every selected platform", () => {
  const brief = resolveCampaignBrief({
    campaign: campaign(),
    intelligence: intelligence(),
  });
  const strategy = approvedStrategy();
  for (const platform of brief.platforms) {
    assert.match(
      strategy.contentDirection.toLowerCase(),
      new RegExp(platform.toLowerCase()),
    );
  }
  assert.equal(
    validateStrategy({ strategy, brief }).some(
      (issue) => issue.code === "channel_missing",
    ),
    false,
  );
});


test("strategy stages ignore a generic application model and keep compatible fallbacks", () => {
  const models = strategyModelCandidates("planning", {
    OPENAI_STRATEGY_PLANNING_MODEL: "custom-planning-model",
    OPENAI_STRATEGY_MODEL: "custom-strategy-model",
  });

  assert.deepEqual(models, [
    "custom-planning-model",
    "gpt-4.1",
    "gpt-4.1-mini",
  ]);

  const defaultModels = strategyModelCandidates("strategy", {});
  assert.deepEqual(defaultModels, ["gpt-4.1", "gpt-4.1-mini"]);
});

test("safe OpenAI error parsing identifies model compatibility failures", () => {
  const details = parseSafeOpenAiError(
    JSON.stringify({
      error: {
        code: "model_not_found",
        type: "invalid_request_error",
        message: "The requested model does not exist or you do not have access.",
      },
    }),
  );

  assert.equal(details.code, "model_not_found");
  assert.equal(
    shouldTryNextStrategyModel({ status: 404, details }),
    true,
  );
  assert.equal(
    shouldTryNextStrategyModel({ status: 401, details }),
    false,
  );
});

test("Brand Voice Free Consultation is available as both an offer and usable CTA", () => {
  const options = buildBrandVoiceMonthlyOptions({
    cloneProfile: {
      offer_summary: "Website Audit, Marketing VIP Demo, Free Consultation",
      sales_outcome_summary: "Help qualified prospects choose a practical next step",
    },
    accountBrandProfile: null,
    brandRules: [],
  });

  assert.ok(options.offers.some((option) => option.value === "Free Consultation"));
  assert.ok(
    options.ctas.some(
      (option) => option.value === "Schedule a Free Consultation",
    ),
  );
});
