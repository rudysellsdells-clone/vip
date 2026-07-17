import type { OneOffCampaignStrategy } from "../one-off-strategy-gate.ts";

export const STRATEGY_ENGINE_V2_VERSION = "h1.9a1" as const;

export type OfferCategory =
  | "demo"
  | "audit"
  | "consultation"
  | "webinar"
  | "guide"
  | "trial"
  | "product"
  | "service"
  | "informational"
  | "unknown";

export type OfferAuthoritySource =
  | "campaign_offer"
  | "selected_account_offer"
  | "campaign_cta"
  | "campaign_goal"
  | "campaign_topic"
  | "informational";

export type StrategySourceConflict = {
  code: string;
  severity: "warning" | "blocking";
  message: string;
  winningSource: string;
  ignoredSource: string | null;
};

export type ResolvedOffer = {
  name: string;
  category: OfferCategory;
  source: OfferAuthoritySource;
  selectedAccountOfferName: string | null;
  selectedAccountOfferCompatible: boolean;
  ignoredOfferNames: string[];
  forbiddenTerms: string[];
  conflicts: StrategySourceConflict[];
};

export type ResolvedAudience = {
  label: string;
  buyerDescription: string;
  painSignals: string[];
  desiredOutcomes: string[];
  objections: string[];
};

export type VerifiedOfferFacts = {
  name: string;
  description: string;
  outcome: string;
  type: string;
  priceNotes: string;
  cta: string;
  deliverables: string[];
};

export type ResolvedCampaignBrief = {
  version: typeof STRATEGY_ENGINE_V2_VERSION;
  campaignName: string;
  campaignTopic: string;
  campaignGoal: string;
  primaryCta: string;
  tone: string;
  platforms: string[];
  audience: ResolvedAudience;
  promotedOffer: ResolvedOffer;
  verifiedOfferFacts: VerifiedOfferFacts;
  relatedService: {
    name: string;
    description: string;
    outcome: string;
  };
  approvedProof: string[];
  internalGuidance: {
    differentiator: string;
    originalityAngle: string;
    objections: string;
    creatorNotes: string;
  };
  resolutionWarnings: string[];
};

export type StrategySemanticPlan = {
  buyerTrigger: string;
  currentWorkaround: string;
  rootCause: string;
  businessConsequence: string;
  campaignBelief: string;
  offerMechanism: string;
  desiredDecision: string;
  primaryObjection: string;
  objectionResponse: string;
};

export type StrategySemanticPlanKey = keyof StrategySemanticPlan;

export type StrategySemanticPlanIssue = {
  field: StrategySemanticPlanKey | "crossSection" | "offerAuthority";
  code: string;
  message: string;
};

export type StrategyQualityReview = {
  approved: boolean;
  issues: string[];
  strategy: OneOffCampaignStrategy;
};

export type StrategyQualityGateStage =
  | "configuration"
  | "planning"
  | "planning_repair"
  | "strategy"
  | "quality_review"
  | "final_validation";

export type StrategyQualityGateRequestStatus =
  | "not_started"
  | "completed"
  | "timeout"
  | "api_error"
  | "invalid_response";

export type StrategyQualityGateDiagnostic = {
  stage: StrategyQualityGateStage;
  requestStatus: StrategyQualityGateRequestStatus;
  completedStages: StrategyQualityGateStage[];
  blockingIssues: string[];
  advisoryIssues: string[];
  reviewApproved: boolean | null;
  reviewIssues: string[];
  retryable: boolean;
};

export type StrategyFieldKey = keyof OneOffCampaignStrategy;

export type StrategyFieldContract = {
  field: StrategyFieldKey;
  label: string;
  purpose: string;
  allowedSources: string[];
  forbiddenSources: string[];
  requirements: string[];
  minWords: number;
  maxWords: number;
};

export type StrategyValidationIssue = {
  field: StrategyFieldKey | "crossSection" | "offerAuthority";
  code: string;
  severity: "warning" | "critical";
  message: string;
};

export type StrategyEngineDiagnostics = {
  version: typeof STRATEGY_ENGINE_V2_VERSION;
  promotedOffer: string;
  offerSource: OfferAuthoritySource;
  offerCategory: OfferCategory;
  selectedAccountOffer: string | null;
  ignoredOffers: string[];
  conflicts: StrategySourceConflict[];
  validationIssueCount: number;
  repairPassUsed: boolean;
  deterministicSafeguardsUsed: false;
  semanticPlanGenerated: boolean;
  semanticPlanRepairUsed: boolean;
  qualityReviewPassed: boolean;
};
