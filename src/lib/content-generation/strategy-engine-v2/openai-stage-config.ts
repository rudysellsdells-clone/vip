export type StrategyOpenAiStage =
  | "planning"
  | "planning_repair"
  | "strategy"
  | "strategy_repair"
  | "quality_review";

type StrategyModelEnvironment = {
  [key: string]: string | undefined;
  OPENAI_STRATEGY_PLANNING_MODEL?: string;
  OPENAI_STRATEGY_MODEL?: string;
  OPENAI_STRATEGY_QUALITY_MODEL?: string;
};

export type SafeOpenAiErrorDetails = {
  code: string;
  type: string;
  message: string;
};

const DEFAULT_MODEL_ORDER: Record<StrategyOpenAiStage, string[]> = {
  planning: ["gpt-4.1", "gpt-4.1-mini"],
  planning_repair: ["gpt-4.1", "gpt-4.1-mini"],
  strategy: ["gpt-4.1", "gpt-4.1-mini"],
  strategy_repair: ["gpt-4.1", "gpt-4.1-mini"],
  quality_review: ["gpt-4.1", "gpt-4.1-mini"],
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function configuredModel(
  stage: StrategyOpenAiStage,
  environment: StrategyModelEnvironment,
) {
  if (stage === "planning" || stage === "planning_repair") {
    return clean(environment.OPENAI_STRATEGY_PLANNING_MODEL);
  }

  if (stage === "quality_review") {
    return clean(environment.OPENAI_STRATEGY_QUALITY_MODEL);
  }

  return clean(environment.OPENAI_STRATEGY_MODEL);
}

/**
 * Strategy generation intentionally ignores the application-wide OPENAI_MODEL.
 * That variable may be configured for a Responses-only, image, audio, or other
 * model that is not compatible with this Chat Completions JSON workflow.
 */
export function strategyModelCandidates(
  stage: StrategyOpenAiStage,
  environment: StrategyModelEnvironment = process.env,
) {
  const candidates = [
    configuredModel(stage, environment),
    ...DEFAULT_MODEL_ORDER[stage],
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

export function parseSafeOpenAiError(text: string): SafeOpenAiErrorDetails {
  try {
    const payload = JSON.parse(text) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { code: "", type: "", message: "" };
    }

    const error = (payload as Record<string, unknown>).error;
    if (!error || typeof error !== "object" || Array.isArray(error)) {
      return { code: "", type: "", message: "" };
    }

    const record = error as Record<string, unknown>;
    return {
      code: clean(record.code).slice(0, 80),
      type: clean(record.type).slice(0, 80),
      message: clean(record.message).replace(/\s+/g, " ").slice(0, 240),
    };
  } catch {
    return { code: "", type: "", message: "" };
  }
}

export function shouldTryNextStrategyModel({
  status,
  details,
}: {
  status: number;
  details: SafeOpenAiErrorDetails;
}) {
  if (![400, 403, 404, 422].includes(status)) return false;

  const combined = `${details.code} ${details.type} ${details.message}`.toLowerCase();
  return /model|unsupported|not available|does not exist|access to .* model|endpoint/.test(
    combined,
  );
}
