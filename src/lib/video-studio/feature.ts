export type VideoStudioFeatureEnvironment = {
  serverValue?: string;
  publicValue?: string;
  gitRef?: string;
};

function parseFeatureFlag(value: string | undefined) {
  if (value === undefined) return null;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function resolveVideoStudioEnabled({
  serverValue,
  publicValue,
  gitRef,
}: VideoStudioFeatureEnvironment) {
  const explicitValue = parseFeatureFlag(serverValue ?? publicValue);
  if (explicitValue !== null) return explicitValue;

  return gitRef === "h1-18-unified-video-studio";
}

export function isVideoStudioEnabled() {
  return resolveVideoStudioEnabled({
    serverValue: process.env.ENABLE_VIDEO_STUDIO,
    publicValue: process.env.NEXT_PUBLIC_ENABLE_VIDEO_STUDIO,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF,
  });
}
