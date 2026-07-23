import type {
  VideoProvider,
  VideoRenderStatus,
  VideoReviewStatus,
} from "./video-package";

export type VideoProviderCapability =
  | "text_to_video"
  | "image_to_video"
  | "extend_video"
  | "workflow_generation"
  | "campaign_source"
  | "ad_source";

export type VideoProviderDefinition = {
  id: VideoProvider;
  label: string;
  executionMode: "direct_api" | "managed_workflow";
  capabilities: VideoProviderCapability[];
  currentSystem: string;
  requiredEnvironment: string[];
};

export const VIDEO_PROVIDER_REGISTRY: Record<
  VideoProvider,
  VideoProviderDefinition
> = {
  luma: {
    id: "luma",
    label: "Luma Dream Machine",
    executionMode: "direct_api",
    capabilities: [
      "text_to_video",
      "image_to_video",
      "extend_video",
      "campaign_source",
      "ad_source",
    ],
    currentSystem: "Direct Luma generation and scene-extension routes",
    requiredEnvironment: ["LUMA_API_KEY"],
  },
  magica: {
    id: "magica",
    label: "Magica",
    executionMode: "managed_workflow",
    capabilities: [
      "image_to_video",
      "workflow_generation",
      "campaign_source",
      "ad_source",
    ],
    currentSystem: "Existing GalaxyAI-compatible workflow and run routes",
    requiredEnvironment: ["MAGICA_API_KEY or GALAXYAI_API_KEY"],
  },
};

export type UnifiedVideoRun = {
  id: string;
  provider: VideoProvider;
  providerRunId: string | null;
  campaignId: string | null;
  sourceAssetId: string | null;
  title: string;
  renderStatus: VideoRenderStatus;
  reviewStatus: VideoReviewStatus;
  outputUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  rawStatus: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstOutputUrl(value: unknown) {
  const output = record(value);
  const media = record(output.media);
  return stringOrNull(
    output.finalVideoUrl ??
      output.videoUrl ??
      output.url ??
      media.videoUrl ??
      media.url,
  );
}

export function normalizeLumaRenderStatus(status: string): VideoRenderStatus {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "draft") return "draft";
  if (status.startsWith("generating_scene_")) return "rendering";
  return "queued";
}

export function normalizeMagicaRenderStatus(status: string): VideoRenderStatus {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "running") return "rendering";
  if (status === "queued") return "queued";
  return "draft";
}

export function normalizeLumaRun(
  run: Record<string, unknown>,
): UnifiedVideoRun {
  const id = String(run.id ?? "");
  return {
    id,
    provider: "luma",
    providerRunId: null,
    campaignId: stringOrNull(run.campaign_id),
    sourceAssetId: null,
    title: `Luma campaign video ${id.slice(0, 8)}`,
    renderStatus: normalizeLumaRenderStatus(String(run.status ?? "draft")),
    reviewStatus: "not_submitted",
    outputUrl: stringOrNull(run.final_video_url),
    error: stringOrNull(run.error),
    createdAt: String(run.created_at ?? ""),
    updatedAt: String(run.updated_at ?? run.created_at ?? ""),
    rawStatus: String(run.status ?? "draft"),
  };
}

export function normalizeMagicaRun(
  run: Record<string, unknown>,
): UnifiedVideoRun {
  const id = String(run.id ?? "");
  return {
    id,
    provider: "magica",
    providerRunId: stringOrNull(run.galaxy_run_id),
    campaignId: stringOrNull(run.campaign_id),
    sourceAssetId: stringOrNull(run.asset_id),
    title: `Magica workflow ${stringOrNull(run.galaxy_workflow_id) ?? id.slice(0, 8)}`,
    renderStatus: normalizeMagicaRenderStatus(String(run.status ?? "queued")),
    reviewStatus: "not_submitted",
    outputUrl: firstOutputUrl(run.output),
    error: stringOrNull(run.error),
    createdAt: String(run.created_at ?? ""),
    updatedAt: String(run.updated_at ?? run.created_at ?? ""),
    rawStatus: String(run.status ?? "queued"),
  };
}

export function providerConfigurationStatus(environment: {
  lumaApiKey?: string;
  magicaApiKey?: string;
  galaxyAiApiKey?: string;
}) {
  return {
    luma: Boolean(environment.lumaApiKey?.trim()),
    magica: Boolean(
      environment.magicaApiKey?.trim() || environment.galaxyAiApiKey?.trim(),
    ),
  } satisfies Record<VideoProvider, boolean>;
}
