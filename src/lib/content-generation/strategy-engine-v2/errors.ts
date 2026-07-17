export type StrategyQualityGateStage =
  | "configuration"
  | "planning"
  | "strategy"
  | "quality_review";

export class StrategyQualityGateError extends Error {
  readonly code = "STRATEGY_QUALITY_GATE";
  readonly retryable: boolean;
  readonly stage: StrategyQualityGateStage;

  constructor({
    message,
    stage,
    retryable = true,
  }: {
    message: string;
    stage: StrategyQualityGateStage;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "StrategyQualityGateError";
    this.stage = stage;
    this.retryable = retryable;
  }
}

export function strategyQualityGateMessage(stage: StrategyQualityGateStage) {
  if (stage === "configuration") {
    return "Marketing VIP could not generate a strategy because the strategy AI connection is not configured. No preview was created.";
  }

  return "Marketing VIP did not produce a strategy that met the quality standard. No preview was created. Please retry the generation; the campaign inputs remain unchanged.";
}
