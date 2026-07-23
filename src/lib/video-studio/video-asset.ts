import type { AdPackage } from "@/lib/ad-studio/ad-package";
import type { VideoPackage, VideoProvider } from "./video-package";

export type VideoAssetMetadata = {
  generatedBy: "video_studio";
  workflowVersion: string;
  videoPackage: VideoPackage;
  provider: VideoProvider;
  sourceType: VideoPackage["source"]["type"];
  sourceId: string;
  render?: {
    provider: VideoProvider;
    runId: string;
    providerRunId: string | null;
    startedAt: string;
  } | null;
};

export function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function adPackageFromMetadata(value: unknown): AdPackage | null {
  const metadata = recordValue(value);
  const candidate = recordValue(metadata.adPackage);
  if (
    metadata.generatedBy !== "ad_studio" ||
    candidate.version !== "h1.17" ||
    !textValue(candidate.accountId) ||
    !textValue(candidate.campaignId) ||
    !textValue(candidate.channel) ||
    !Array.isArray(candidate.variants)
  ) {
    return null;
  }
  return candidate as unknown as AdPackage;
}

export function videoPackageFromMetadata(value: unknown): VideoPackage | null {
  const metadata = recordValue(value);
  const candidate = recordValue(metadata.videoPackage);
  if (
    metadata.generatedBy !== "video_studio" ||
    candidate.version !== "h1.18" ||
    !textValue(candidate.accountId) ||
    !textValue(recordValue(candidate.source).id) ||
    !textValue(candidate.provider) ||
    !Array.isArray(candidate.shotList)
  ) {
    return null;
  }
  return candidate as unknown as VideoPackage;
}

export function renderVideoPackageContent(videoPackage: VideoPackage) {
  return [
    videoPackage.title,
    `Provider: ${videoPackage.provider === "luma" ? "Luma Dream Machine" : "Magica"}`,
    `Source: ${videoPackage.source.title}`,
    `Objective: ${videoPackage.objective}`,
    `Audience: ${videoPackage.audience}`,
    `Offer: ${videoPackage.offer}`,
    `Concept: ${videoPackage.concept}`,
    `Hook: ${videoPackage.hook}`,
    `Duration: ${videoPackage.durationSeconds} seconds`,
    `Aspect ratio: ${videoPackage.aspectRatio}`,
    videoPackage.destinationUrl ? `Destination: ${videoPackage.destinationUrl}` : null,
    "",
    "SCRIPT",
    videoPackage.script,
    "",
    "VOICEOVER",
    videoPackage.voiceover,
    "",
    "SHOT LIST",
    ...videoPackage.shotList.flatMap((shot) => [
      `${shot.order}. ${shot.label} — ${shot.durationSeconds}s`,
      `Visual: ${shot.visualDirection}`,
      `Voiceover: ${shot.voiceover}`,
      shot.onScreenText ? `On-screen text: ${shot.onScreenText}` : null,
      "",
    ]),
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
    .trim();
}

export function lumaScenePlanFromPackage(videoPackage: VideoPackage) {
  return videoPackage.shotList.slice(0, 4).map((shot, index) => ({
    sceneIndex: index,
    label: shot.label,
    durationSeconds: 5,
    prompt: [
      "Create a polished, realistic business marketing video with natural lighting, believable environments, purposeful camera movement, and consistent visual continuity.",
      `Overall concept: ${videoPackage.concept}`,
      `Scene ${index + 1} of ${Math.min(4, videoPackage.shotList.length)}: ${shot.label}.`,
      `Visual direction: ${shot.visualDirection}`,
      shot.onScreenText
        ? `Communicate this idea visually without rendering readable text: ${shot.onScreenText}`
        : "Do not render readable text overlays.",
      "Do not invent statistics, awards, guarantees, dashboards, or exaggerated before-and-after results.",
      `Aspect ratio ${videoPackage.aspectRatio}.`,
    ].join(" "),
  }));
}
