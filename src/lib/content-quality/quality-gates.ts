export type QualityGateSettings = {
  overall_min: number;
  brand_voice_min: number;
  clarity_min: number;
  cta_min: number;
  seo_aio_min: number;
  conversion_min: number;
  approval_mode: "mark_ready" | "auto_approve" | "disabled";
  require_human_approval: boolean;
  is_enabled: boolean;
};

export type QualityGateEvaluation = {
  passed: boolean;
  decision: "ready_for_publishing" | "auto_approved" | "needs_revision" | "manual_review" | "disabled";
  reason: string;
  failedChecks: string[];
};

export const DEFAULT_QUALITY_GATE_SETTINGS: QualityGateSettings = {
  overall_min: 90,
  brand_voice_min: 85,
  clarity_min: 80,
  cta_min: 85,
  seo_aio_min: 75,
  conversion_min: 80,
  approval_mode: "mark_ready",
  require_human_approval: true,
  is_enabled: true,
};

function clampScore(value: unknown, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeApprovalMode(value: unknown): QualityGateSettings["approval_mode"] {
  const mode = String(value ?? "").trim();

  if (mode === "mark_ready" || mode === "auto_approve" || mode === "disabled") {
    return mode;
  }

  return DEFAULT_QUALITY_GATE_SETTINGS.approval_mode;
}

export function normalizeQualityGateSettings(row?: Record<string, any> | null): QualityGateSettings {
  return {
    overall_min: clampScore(row?.overall_min, DEFAULT_QUALITY_GATE_SETTINGS.overall_min),
    brand_voice_min: clampScore(row?.brand_voice_min, DEFAULT_QUALITY_GATE_SETTINGS.brand_voice_min),
    clarity_min: clampScore(row?.clarity_min, DEFAULT_QUALITY_GATE_SETTINGS.clarity_min),
    cta_min: clampScore(row?.cta_min, DEFAULT_QUALITY_GATE_SETTINGS.cta_min),
    seo_aio_min: clampScore(row?.seo_aio_min, DEFAULT_QUALITY_GATE_SETTINGS.seo_aio_min),
    conversion_min: clampScore(row?.conversion_min, DEFAULT_QUALITY_GATE_SETTINGS.conversion_min),
    approval_mode: normalizeApprovalMode(row?.approval_mode),
    require_human_approval:
      typeof row?.require_human_approval === "boolean"
        ? row.require_human_approval
        : DEFAULT_QUALITY_GATE_SETTINGS.require_human_approval,
    is_enabled:
      typeof row?.is_enabled === "boolean"
        ? row.is_enabled
        : DEFAULT_QUALITY_GATE_SETTINGS.is_enabled,
  };
}

export async function getOrCreateQualityGateSettings({
  supabase,
  userId,
}: {
  supabase: any;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("quality_gate_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data;
  }

  const { data: created, error: createError } = await supabase
    .from("quality_gate_settings")
    .insert({
      user_id: userId,
      ...DEFAULT_QUALITY_GATE_SETTINGS,
    })
    .select("*")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Unable to create quality gate settings.");
  }

  return created;
}

export function evaluateQualityGate({
  review,
  settings,
}: {
  review: Record<string, any>;
  settings: QualityGateSettings;
}): QualityGateEvaluation {
  if (!settings.is_enabled || settings.approval_mode === "disabled") {
    return {
      passed: false,
      decision: "disabled",
      reason: "Quality gates are disabled.",
      failedChecks: [],
    };
  }

  const checks = [
    {
      label: "Overall score",
      actual: Number(review.overall_score ?? 0),
      required: settings.overall_min,
    },
    {
      label: "Brand voice score",
      actual: Number(review.brand_voice_score ?? 0),
      required: settings.brand_voice_min,
    },
    {
      label: "Clarity score",
      actual: Number(review.clarity_score ?? 0),
      required: settings.clarity_min,
    },
    {
      label: "CTA score",
      actual: Number(review.cta_score ?? 0),
      required: settings.cta_min,
    },
    {
      label: "SEO/AIO score",
      actual: Number(review.seo_aio_score ?? 0),
      required: settings.seo_aio_min,
    },
    {
      label: "Conversion score",
      actual: Number(review.conversion_score ?? 0),
      required: settings.conversion_min,
    },
  ];

  const failedChecks = checks
    .filter((check) => check.actual < check.required)
    .map((check) => `${check.label}: ${check.actual}/${check.required}`);

  if (failedChecks.length) {
    return {
      passed: false,
      decision: "needs_revision",
      reason: `Quality gate failed: ${failedChecks.join("; ")}`,
      failedChecks,
    };
  }

  if (settings.approval_mode === "auto_approve" && !settings.require_human_approval) {
    return {
      passed: true,
      decision: "auto_approved",
      reason: "Asset passed all thresholds and auto-approval is enabled.",
      failedChecks: [],
    };
  }

  return {
    passed: true,
    decision: "ready_for_publishing",
    reason: "Asset passed all thresholds and is ready for publishing review.",
    failedChecks: [],
  };
}

export function scoreSnapshot(review: Record<string, any>) {
  return {
    overall_score: review.overall_score,
    brand_voice_score: review.brand_voice_score,
    clarity_score: review.clarity_score,
    cta_score: review.cta_score,
    seo_aio_score: review.seo_aio_score,
    conversion_score: review.conversion_score,
    review_status: review.status,
  };
}
