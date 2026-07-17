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
  parseSafeOpenAiError,
  shouldTryNextStrategyModel,
  strategyModelCandidates,
  type StrategyOpenAiStage,
} from "@/lib/content-generation/strategy-engine-v2/openai-stage-config";
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
import {
  finalReleaseAdvisoryIssues,
  finalReleaseBlockingIssues,
  normalizeStrategyForFinalRelease,
} from "@/lib/content-generation/strategy-engine-v2/strategy-release";
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

class StrategyStageRequestError extends Error {
  readonly requestStatus: StrategyQualityGateRequestStatus;
  readonly httpStatus: number | null;
  readonly apiErrorCode: string | null;
  readonly requestId: string | null;
  readonly attemptedModels: string[];

  constructor({
    message,
    requestStatus,
    httpStatus = null,
    apiErrorCode = null,
    requestId = null,
    attemptedModels = [],
  }: {
    message: string;
    requestStatus: StrategyQualityGateRequestStatus;
    httpStatus?: number | null;
    apiErrorCode?: string | null;
    requestId?: string | null;
    attemptedModels?: string[];
  }) {
    super(message);
    this.name = "StrategyStageRequestError";
    this.requestStatus = requestStatus;
    this.httpStatus = httpStatus;
    this.apiErrorCode = apiErrorCode;
    this.requestId = requestId;
    this.attemptedModels = attemptedModels;
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
  temperature,
  stage,
}: {
  apiKey: string;
  messages: OpenAiMessage[];
  temperature: number;
  stage: StrategyOpenAiStage;
}) {
  const models = strategyModelCandidates(stage);
  const attemptedModels: string[] = [];

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index]!;
    attemptedModels.push(model);
    const clientRequestId = crypto.randomUUID();
    let response: Response;

    try {
      response = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-Client-Request-Id": clientRequestId,
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
      throw new StrategyStageRequestError({
        message: timedOut
          ? `OpenAI ${stage} request timed out.`
          : `OpenAI ${stage} request could not be completed.`,
        requestStatus: timedOut ? "timeout" : "api_error",
        attemptedModels,
        requestId: clientRequestId,
      });
    }

    const text = await response.text();
    const requestId = response.headers.get("x-request-id") || clientRequestId;

    if (!response.ok) {
      const details = parseSafeOpenAiError(text);
      const hasNextModel = index < models.length - 1;

      if (
        hasNextModel &&
        shouldTryNextStrategyModel({ status: response.status, details })
      ) {
        console.warn("Strategy model was unavailable; retrying with a compatible fallback.", {
          stage,
          model,
          status: response.status,
          code: details.code || details.type || "unknown",
          requestId,
        });
        continue;
      }

      throw new StrategyStageRequestError({
        message: `OpenAI ${stage} request failed with status ${response.status}.`,
        requestStatus: "api_error",
        httpStatus: response.status,
        apiErrorCode: details.code || details.type || null,
        requestId,
        attemptedModels,
      });
    }

    const payload = safeJsonParse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new StrategyStageRequestError({
        message: `OpenAI returned an unexpected ${stage} response.`,
        requestStatus: "invalid_response",
        requestId,
        attemptedModels,
      });
    }

    const choices = (payload as Record<string, unknown>).choices;
    if (!Array.isArray(choices)) {
      throw new StrategyStageRequestError({
        message: `OpenAI ${stage} response did not include choices.`,
        requestStatus: "invalid_response",
        requestId,
        attemptedModels,
      });
    }

    const message = (choices[0] as Record<string, unknown> | undefined)?.message;
    const content =
      message && typeof message === "object" && !Array.isArray(message)
        ? (message as Record<string, unknown>).content
        : null;

    if (typeof content !== "string") {
      throw new StrategyStageRequestError({
        message: `OpenAI ${stage} response did not include message content.`,
        requestStatus: "invalid_response",
        requestId,
        attemptedModels,
      });
    }

    const parsed = extractJson(content);
    if (!parsed) {
      throw new StrategyStageRequestError({
        message: `OpenAI ${stage} response did not contain valid JSON.`,
        requestStatus: "invalid_response",
        requestId,
        attemptedModels,
      });
    }

    return parsed;
  }

  throw new StrategyStageRequestError({
    message: `OpenAI ${stage} request did not find a compatible strategy model.`,
    requestStatus: "api_error",
    attemptedModels,
  });
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

function requestDiagnosticFromError(
  error: unknown,
): Pick<
  StrategyQualityGateDiagnostic,
  | "httpStatus"
  | "apiErrorCode"
  | "requestId"
  | "attemptedModels"
  | "fallbackModelUsed"
> {
  if (!(error instanceof StrategyStageRequestError)) {
    return {
      httpStatus: null,
      apiErrorCode: null,
      requestId: null,
      attemptedModels: [],
      fallbackModelUsed: false,
    };
  }

  return {
    httpStatus: error.httpStatus,
    apiErrorCode: error.apiErrorCode,
    requestId: error.requestId,
    attemptedModels: error.attemptedModels,
    fallbackModelUsed: error.attemptedModels.length > 1,
  };
}


function requestFailureMessage(error: unknown, fallback: string) {
  if (!(error instanceof StrategyStageRequestError)) return fallback;

  if (error.httpStatus === 401) {
    return "OpenAI rejected the configured API key. Confirm the production OPENAI_API_KEY is active and belongs to a funded project.";
  }
  if (error.httpStatus === 403) {
    return "OpenAI received the request but the project does not have access to the requested strategy model.";
  }
  if (error.httpStatus === 404) {
    return "The configured strategy model was unavailable. Marketing VIP attempted its compatible fallback models before stopping.";
  }
  if (error.httpStatus === 429) {
    return "OpenAI rejected the request because of a rate, quota, or billing limit. The strategy was not evaluated.";
  }
  if (error.httpStatus && error.httpStatus >= 500) {
    return "OpenAI returned a temporary server error before strategy quality evaluation began.";
  }
  return fallback;
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
      ...requestDiagnosticFromError(error),
      completedStages: [],
      blockingIssues: [
        requestStatusFromError(error) === "timeout"
          ? "The private semantic-planning request timed out before quality evaluation began."
          : requestFailureMessage(
              error,
              "The private semantic-planning request did not return a usable response.",
            ),
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
        ...requestDiagnosticFromError(error),
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
      ...requestDiagnosticFromError(error),
      completedStages: ["planning"],
      blockingIssues: [
        requestStatusFromError(error) === "timeout"
          ? "The strategy-writing request timed out after the semantic plan passed."
          : requestFailureMessage(
              error,
              "The strategy-writing request did not return a complete thirteen-field strategy.",
            ),
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
      ...requestDiagnosticFromError(error),
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
  strategy = normalizeStrategyForFinalRelease({
    strategy: review.strategy,
    brief,
  });
  const finalIssues = validateStrategy({ strategy, brief });
  const releaseBlockingIssues = finalReleaseBlockingIssues(finalIssues);
  const releaseAdvisoryIssues = finalReleaseAdvisoryIssues(finalIssues);

  if (!review.approved || releaseBlockingIssues.length) {
    const editorialBlocking = !review.approved
      ? ["The independent editorial reviewer did not approve the rewritten strategy."]
      : [];
    console.error("H1.9A blocked a low-quality strategy preview.", {
      reviewApproved: review.approved,
      reviewIssues: review.issues,
      deterministicBlockingIssues: releaseBlockingIssues,
      deterministicAdvisoryIssues: releaseAdvisoryIssues,
    });
    throw publicQualityError(
      releaseBlockingIssues.length ? "final_validation" : "quality_review",
      {
        requestStatus: "completed",
        completedStages: ["planning", "strategy", "quality_review"],
        blockingIssues: safeMessages([
          ...editorialBlocking,
          ...releaseBlockingIssues.map(
            (issue) => `${issue.field}: ${issue.message}`,
          ),
        ]),
        advisoryIssues: safeMessages([
          ...releaseAdvisoryIssues.map(
            (issue) => `${issue.field}: ${issue.message}`,
          ),
          ...(review.approved ? review.issues : []),
        ]),
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
      validationIssueCount: releaseAdvisoryIssues.length,
      repairPassUsed,
      semanticPlanRepairUsed,
    }),
  };
}
