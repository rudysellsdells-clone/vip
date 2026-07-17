import type { CampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import type { OneOffPromptCampaign } from "@/lib/content-generation/one-off-campaign-brief";
import {
  blockingBriefConflicts,
  resolveCampaignBrief,
} from "@/lib/content-generation/strategy-engine-v2/campaign-brief-resolver";
import {
  StrategyQualityGateError,
  strategyQualityGateMessage,
  type StrategyQualityGateStage,
} from "@/lib/content-generation/strategy-engine-v2/errors";
import {
  buildQualityReviewSystemPrompt,
  buildQualityReviewUserPrompt,
  buildSemanticPlanRepairSystemPrompt,
  buildSemanticPlanRepairUserPrompt,
  buildSemanticPlanSystemPrompt,
  buildSemanticPlanUserPrompt,
  buildStrategySystemPrompt,
  buildStrategyUserPrompt,
} from "@/lib/content-generation/strategy-engine-v2/prompts";
import {
  normalizeStrategySemanticPlan,
  validateStrategySemanticPlan,
} from "@/lib/content-generation/strategy-engine-v2/semantic-plan";
import { validateStrategy } from "@/lib/content-generation/strategy-engine-v2/strategy-validator";
import type {
  ResolvedCampaignBrief,
  StrategyEngineDiagnostics,
  StrategyQualityGateDiagnostic,
  StrategyQualityGateRequestStatus,
  StrategyQualityReview,
  StrategySemanticPlan,
  StrategyValidationIssue,
} from "@/lib/content-generation/strategy-engine-v2/types";
import {
  normalizeOneOffCampaignStrategy,
  oneOffStrategyMissingRequired,
  type OneOffCampaignStrategy,
} from "@/lib/content-generation/one-off-strategy-gate";

type OpenAiMessage = { role: "system" | "user"; content: string };
type OpenAiStage = "planning" | "planning_repair" | "strategy" | "strategy_repair" | "quality_review";

class StrategyStageRequestError extends Error {
  readonly requestStatus: StrategyQualityGateRequestStatus;

  constructor(message: string, requestStatus: StrategyQualityGateRequestStatus) {
    super(message);
    this.name = "StrategyStageRequestError";
    this.requestStatus = requestStatus;
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractJson(value: string) {
  const direct = safeJsonParse(value);
  if (direct) return direct;

  const first = value.indexOf("{");
  const last = value.lastIndexOf("}");
  if (first < 0 || last <= first) return null;

  return safeJsonParse(value.slice(first, last + 1));
}

function timeoutMs() {
  const parsed = Number(process.env.VIP_STRATEGY_OPENAI_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 14000;
}

function planningModel() {
  return (
    process.env.OPENAI_STRATEGY_PLANNING_MODEL ??
    process.env.OPENAI_STRATEGY_QUALITY_MODEL ??
    process.env.OPENAI_STRATEGY_MODEL ??
    process.env.OPENAI_MODEL ??
    "gpt-4.1"
  );
}

function strategyModel() {
  return (
    process.env.OPENAI_STRATEGY_MODEL ??
    process.env.OPENAI_MODEL ??
    "gpt-4.1"
  );
}

function qualityModel() {
  return (
    process.env.OPENAI_STRATEGY_QUALITY_MODEL ??
    process.env.OPENAI_STRATEGY_MODEL ??
    process.env.OPENAI_MODEL ??
    "gpt-4.1"
  );
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestJson({
  apiKey,
  messages,
  model,
  temperature,
  stage,
}: {
  apiKey: string;
  messages: OpenAiMessage[];
  model: string;
  temperature: number;
  stage: OpenAiStage;
}) {
  let response: Response;

  try {
    response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          response_format: { type: "json_object" },
          messages,
        }),
      },
    );
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new StrategyStageRequestError(
      timedOut
        ? `OpenAI ${stage} request timed out.`
        : `OpenAI ${stage} request could not be completed.`,
      timedOut ? "timeout" : "api_error",
    );
  }

  const text = await response.text();
  if (!response.ok) {
    throw new StrategyStageRequestError(
      `OpenAI ${stage} request failed with status ${response.status}.`,
      "api_error",
    );
  }

  const payload = safeJsonParse(text);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new StrategyStageRequestError(
      `OpenAI returned an unexpected ${stage} response.`,
      "invalid_response",
    );
  }

  const choices = (payload as Record<string, unknown>).choices;
  if (!Array.isArray(choices)) {
    throw new StrategyStageRequestError(
      `OpenAI ${stage} response did not include choices.`,
      "invalid_response",
    );
  }

  const message = (choices[0] as Record<string, unknown> | undefined)?.message;
  const content =
    message && typeof message === "object" && !Array.isArray(message)
      ? (message as Record<string, unknown>).content
      : null;

  if (typeof content !== "string") {
    throw new StrategyStageRequestError(
      `OpenAI ${stage} response did not include message content.`,
      "invalid_response",
    );
  }

  const parsed = extractJson(content);
  if (!parsed) {
    throw new StrategyStageRequestError(
      `OpenAI ${stage} response did not contain valid JSON.`,
      "invalid_response",
    );
  }

  return parsed;
}

function normalizeStrategy(value: unknown) {
  const strategy = normalizeOneOffCampaignStrategy(value);
  if (oneOffStrategyMissingRequired(strategy).length) {
    throw new Error("OpenAI strategy response was missing required strategy fields.");
  }
  return strategy;
}

function normalizeQualityReview(value: unknown): StrategyQualityReview {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const issues = Array.isArray(record.issues)
    ? record.issues
        .map((item) => String(item ?? "").trim())
        .filter(
          (item) =>
            Boolean(item) &&
            !/^(none|no (?:remaining )?(?:issues|concerns)(?: found)?|n\/?a|not applicable)[.!]?$/i.test(item),
        )
        .slice(0, 20)
    : [];

  return {
    approved: record.approved === true,
    issues,
    strategy: normalizeStrategy(record.strategy),
  };
}

function safeMessages(values: string[], limit = 12) {
  return values
    .map((value) => String(value ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((value) => (value.length > 280 ? `${value.slice(0, 277).trim()}...` : value))
    .slice(0, limit);
}

function requestStatusFromError(error: unknown): StrategyQualityGateRequestStatus {
  if (error instanceof StrategyStageRequestError) return error.requestStatus;
  return "invalid_response";
}

function splitValidationIssues(issues: StrategyValidationIssue[]) {
  return {
    blockingIssues: safeMessages(
      issues
        .filter((issue) => issue.severity === "critical")
        .map((issue) => `${issue.field}: ${issue.message}`),
    ),
    advisoryIssues: safeMessages(
      issues
        .filter((issue) => issue.severity === "warning")
        .map((issue) => `${issue.field}: ${issue.message}`),
    ),
  };
}

function publicQualityError(
  stage: StrategyQualityGateStage,
  diagnostic: Partial<StrategyQualityGateDiagnostic> = {},
) {
  return new StrategyQualityGateError({
    stage,
    message: strategyQualityGateMessage(stage),
    retryable: stage !== "configuration",
    diagnostic,
  });
}

function diagnostics({
  brief,
  validationIssueCount,
  repairPassUsed,
  semanticPlanRepairUsed,
}: {
  brief: ResolvedCampaignBrief;
  validationIssueCount: number;
  repairPassUsed: boolean;
  semanticPlanRepairUsed: boolean;
}): StrategyEngineDiagnostics {
  return {
    version: brief.version,
    promotedOffer: brief.promotedOffer.name,
    offerSource: brief.promotedOffer.source,
    offerCategory: brief.promotedOffer.category,
    selectedAccountOffer: brief.promotedOffer.selectedAccountOfferName,
    ignoredOffers: brief.promotedOffer.ignoredOfferNames,
    conflicts: brief.promotedOffer.conflicts,
    validationIssueCount,
    repairPassUsed,
    deterministicSafeguardsUsed: false,
    semanticPlanGenerated: true,
    semanticPlanRepairUsed,
    qualityReviewPassed: true,
  };
}

async function generateSemanticPlan({
  apiKey,
  brief,
}: {
  apiKey: string;
  brief: ResolvedCampaignBrief;
}) {
  let plan: StrategySemanticPlan;

  try {
    plan = normalizeStrategySemanticPlan(
      await requestJson({
        apiKey,
        model: planningModel(),
        temperature: 0.2,
        stage: "planning",
        messages: [
          { role: "system", content: buildSemanticPlanSystemPrompt() },
          { role: "user", content: buildSemanticPlanUserPrompt(brief) },
        ],
      }),
    );
  } catch (error) {
    console.error("H1.9A semantic planning request failed.", error);
    throw publicQualityError("planning", {
      requestStatus: requestStatusFromError(error),
      completedStages: [],
      blockingIssues: [
        requestStatusFromError(error) === "timeout"
          ? "The private semantic-planning request timed out before quality evaluation began."
          : "The private semantic-planning request did not return a usable response.",
      ],
    });
  }

  let issues = validateStrategySemanticPlan({ plan, brief });
  let repairUsed = false;

  if (issues.length) {
    repairUsed = true;
    try {
      plan = normalizeStrategySemanticPlan(
        await requestJson({
          apiKey,
          model: planningModel(),
          temperature: 0.1,
          stage: "planning_repair",
          messages: [
            { role: "system", content: buildSemanticPlanRepairSystemPrompt() },
            {
              role: "user",
              content: buildSemanticPlanRepairUserPrompt({ brief, plan, issues }),
            },
          ],
        }),
      );
    } catch (error) {
      console.error("H1.9A semantic planning repair failed.", error);
      throw publicQualityError("planning_repair", {
        requestStatus: requestStatusFromError(error),
        completedStages: ["planning"],
        blockingIssues: safeMessages(issues.map((issue) => `${issue.field}: ${issue.message}`)),
      });
    }

    issues = validateStrategySemanticPlan({ plan, brief });
  }

  if (issues.length) {
    console.error("H1.9A semantic plan failed quality validation.", issues);
    throw publicQualityError(repairUsed ? "planning_repair" : "planning", {
      requestStatus: "completed",
      completedStages: repairUsed ? ["planning", "planning_repair"] : ["planning"],
      blockingIssues: safeMessages(issues.map((issue) => `${issue.field}: ${issue.message}`)),
    });
  }

  return { plan, repairUsed };
}

async function generateDraftStrategy({
  apiKey,
  brief,
  plan,
}: {
  apiKey: string;
  brief: ResolvedCampaignBrief;
  plan: StrategySemanticPlan;
}) {
  try {
    return normalizeStrategy(
      await requestJson({
        apiKey,
        model: strategyModel(),
        temperature: 0.3,
        stage: "strategy",
        messages: [
          { role: "system", content: buildStrategySystemPrompt() },
          { role: "user", content: buildStrategyUserPrompt({ brief, plan }) },
        ],
      }),
    );
  } catch (error) {
    console.error("H1.9A strategy writing request failed.", error);
    throw publicQualityError("strategy", {
      requestStatus: requestStatusFromError(error),
      completedStages: ["planning"],
      blockingIssues: [
        requestStatusFromError(error) === "timeout"
          ? "The strategy-writing request timed out after the semantic plan passed."
          : "The strategy-writing request did not return a complete thirteen-field strategy.",
      ],
    });
  }
}

async function runFinalQualityReview({
  apiKey,
  brief,
  plan,
  strategy,
  issues,
}: {
  apiKey: string;
  brief: ResolvedCampaignBrief;
  plan: StrategySemanticPlan;
  strategy: OneOffCampaignStrategy;
  issues: ReturnType<typeof validateStrategy>;
}) {
  try {
    return normalizeQualityReview(
      await requestJson({
        apiKey,
        model: qualityModel(),
        temperature: 0.1,
        stage: "quality_review",
        messages: [
          { role: "system", content: buildQualityReviewSystemPrompt() },
          {
            role: "user",
            content: buildQualityReviewUserPrompt({ brief, plan, strategy, issues }),
          },
        ],
      }),
    );
  } catch (error) {
    console.error("H1.9A final strategy quality review failed.", error);
    const split = splitValidationIssues(issues);
    throw publicQualityError("quality_review", {
      requestStatus: requestStatusFromError(error),
      completedStages: ["planning", "strategy"],
      blockingIssues: split.blockingIssues,
      advisoryIssues: split.advisoryIssues,
      reviewApproved: null,
    });
  }
}

export async function generateOneOffCampaignStrategy({
  campaign,
  intelligence,
}: {
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
}): Promise<{
  strategy: OneOffCampaignStrategy;
  generator: "openai";
  diagnostics: StrategyEngineDiagnostics;
}> {
  const brief = resolveCampaignBrief({ campaign, intelligence });
  const blockingConflicts = blockingBriefConflicts(brief);

  if (blockingConflicts.length) {
    throw new Error(blockingConflicts.map((conflict) => conflict.message).join(" "));
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw publicQualityError("configuration");
  }

  const { plan, repairUsed: semanticPlanRepairUsed } =
    await generateSemanticPlan({ apiKey, brief });

  let strategy = await generateDraftStrategy({ apiKey, brief, plan });
  const issues = validateStrategy({ strategy, brief });
  const repairPassUsed = issues.length > 0;

  // The independent editorial review is the one complete rewrite pass. It sees
  // the full draft and every deterministic issue, which avoids stacking several
  // field-by-field model calls and keeps the route inside its execution budget.
  const review = await runFinalQualityReview({
    apiKey,
    brief,
    plan,
    strategy,
    issues,
  });
  strategy = review.strategy;
  const finalIssues = validateStrategy({ strategy, brief });

  if (!review.approved || review.issues.length || finalIssues.length) {
    const split = splitValidationIssues(finalIssues);
    const editorialBlocking = !review.approved
      ? ["The independent editorial reviewer did not approve the rewritten strategy."]
      : [];
    console.error("H1.9A blocked a low-quality strategy preview.", {
      reviewApproved: review.approved,
      reviewIssues: review.issues,
      deterministicIssues: finalIssues,
    });
    throw publicQualityError(
      finalIssues.length ? "final_validation" : "quality_review",
      {
        requestStatus: "completed",
        completedStages: ["planning", "strategy", "quality_review"],
        blockingIssues: safeMessages([
          ...editorialBlocking,
          ...split.blockingIssues,
        ]),
        advisoryIssues: split.advisoryIssues,
        reviewApproved: review.approved,
        reviewIssues: safeMessages(review.issues),
      },
    );
  }

  return {
    strategy,
    generator: "openai",
    diagnostics: diagnostics({
      brief,
      validationIssueCount: 0,
      repairPassUsed,
      semanticPlanRepairUsed,
    }),
  };
}
