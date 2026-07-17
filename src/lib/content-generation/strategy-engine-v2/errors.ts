import type {
  StrategyQualityGateDiagnostic,
  StrategyQualityGateStage,
} from "./types.ts";

export type { StrategyQualityGateStage } from "./types.ts";

export class StrategyQualityGateError extends Error {
  readonly code = "STRATEGY_QUALITY_GATE";
  readonly retryable: boolean;
  readonly stage: StrategyQualityGateStage;
  readonly diagnostic: StrategyQualityGateDiagnostic;

  constructor({
    message,
    stage,
    retryable = true,
    diagnostic,
  }: {
    message: string;
    stage: StrategyQualityGateStage;
    retryable?: boolean;
    diagnostic?: Partial<StrategyQualityGateDiagnostic>;
  }) {
    super(message);
    this.name = "StrategyQualityGateError";
    this.stage = stage;
    this.retryable = retryable;
    this.diagnostic = {
      stage,
      requestStatus: diagnostic?.requestStatus ?? "not_started",
      completedStages: diagnostic?.completedStages ?? [],
      blockingIssues: diagnostic?.blockingIssues ?? [],
      advisoryIssues: diagnostic?.advisoryIssues ?? [],
      reviewApproved: diagnostic?.reviewApproved ?? null,
      reviewIssues: diagnostic?.reviewIssues ?? [],
      retryable,
      httpStatus: diagnostic?.httpStatus ?? null,
      apiErrorCode: diagnostic?.apiErrorCode ?? null,
      requestId: diagnostic?.requestId ?? null,
      attemptedModels: diagnostic?.attemptedModels ?? [],
      fallbackModelUsed: diagnostic?.fallbackModelUsed ?? false,
    };
  }
}

export function strategyQualityGateMessage(stage: StrategyQualityGateStage) {
  if (stage === "configuration") {
    return "Marketing VIP could not generate a strategy because the strategy AI connection is not configured. No preview was created.";
  }

  if (stage === "planning" || stage === "planning_repair") {
    return "Marketing VIP stopped during private strategy planning. No preview was created. Review the diagnostic details below before retrying.";
  }

  if (stage === "strategy") {
    return "Marketing VIP could not complete the strategy-writing step. No preview was created. Review the diagnostic details below before retrying.";
  }

  return "Marketing VIP did not release this strategy preview because the final quality review found unresolved concerns. Review the diagnostic details below before retrying.";
}
