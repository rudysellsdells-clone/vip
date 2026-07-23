export const VIDEO_PACKAGE_VERSION = "h1.18" as const;

export type VideoProvider = "luma" | "magica";
export type VideoSourceType = "campaign" | "ad_package" | "asset";
export type VideoRenderStatus =
  | "draft"
  | "queued"
  | "rendering"
  | "completed"
  | "failed"
  | "cancelled";
export type VideoReviewStatus =
  | "not_submitted"
  | "needs_review"
  | "approved"
  | "revision_requested"
  | "archived";

export type VideoSourceReference = {
  type: VideoSourceType;
  id: string;
  title: string;
  campaignId: string | null;
  assetId: string | null;
};

export type VideoShot = {
  order: number;
  label: string;
  durationSeconds: number;
  visualDirection: string;
  voiceover: string;
  onScreenText: string | null;
};

export type VideoStrategyLineage = {
  campaignStrategySignature: string | null;
  strategyFoundationSignature: string | null;
  marketIntelligenceSignature: string | null;
  evidenceSourceIds: string[];
};

export type VideoPackage = {
  version: typeof VIDEO_PACKAGE_VERSION;
  accountId: string;
  campaignId: string | null;
  title: string;
  provider: VideoProvider;
  source: VideoSourceReference;
  objective: string;
  audience: string;
  offer: string;
  concept: string;
  hook: string;
  script: string;
  voiceover: string;
  shotList: VideoShot[];
  durationSeconds: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  destinationUrl: string | null;
  renderStatus: VideoRenderStatus;
  reviewStatus: VideoReviewStatus;
  providerRunId: string | null;
  outputUrl: string | null;
  lineage: VideoStrategyLineage;
  createdAt: string;
  updatedAt: string;
};

export type CreateVideoPackageInput = Omit<
  VideoPackage,
  | "version"
  | "renderStatus"
  | "reviewStatus"
  | "providerRunId"
  | "outputUrl"
  | "createdAt"
  | "updatedAt"
> & {
  createdAt?: string;
};

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function createVideoPackageDraft(
  input: CreateVideoPackageInput,
): VideoPackage {
  const now = input.createdAt ?? new Date().toISOString();

  return {
    ...input,
    version: VIDEO_PACKAGE_VERSION,
    title: cleanText(input.title),
    objective: cleanText(input.objective),
    audience: cleanText(input.audience),
    offer: cleanText(input.offer),
    concept: cleanText(input.concept),
    hook: cleanText(input.hook),
    script: input.script.trim(),
    voiceover: input.voiceover.trim(),
    shotList: [...input.shotList]
      .sort((left, right) => left.order - right.order)
      .map((shot, index) => ({
        ...shot,
        order: index + 1,
        label: cleanText(shot.label),
        visualDirection: shot.visualDirection.trim(),
        voiceover: shot.voiceover.trim(),
        onScreenText: shot.onScreenText?.trim() || null,
        durationSeconds: Math.max(1, Math.round(shot.durationSeconds)),
      })),
    durationSeconds: Math.max(5, Math.round(input.durationSeconds)),
    renderStatus: "draft",
    reviewStatus: "not_submitted",
    providerRunId: null,
    outputUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function videoPackageMissingRequired(videoPackage: VideoPackage) {
  const missing: string[] = [];

  if (!videoPackage.accountId) missing.push("Account");
  if (!videoPackage.source.id) missing.push("Source");
  if (!videoPackage.title) missing.push("Title");
  if (!videoPackage.objective) missing.push("Objective");
  if (!videoPackage.audience) missing.push("Audience");
  if (!videoPackage.concept) missing.push("Concept");
  if (!videoPackage.hook) missing.push("Hook");
  if (!videoPackage.script) missing.push("Script");
  if (!videoPackage.shotList.length) missing.push("Shot list");

  return missing;
}

export function isVideoPackageReadyForRender(videoPackage: VideoPackage) {
  return videoPackageMissingRequired(videoPackage).length === 0;
}
