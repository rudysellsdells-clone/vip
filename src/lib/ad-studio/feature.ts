export type AdStudioFeatureEnvironment = {
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

export function resolveAdStudioEnabled({
  serverValue,
  publicValue,
}: AdStudioFeatureEnvironment) {
  const explicitValue = parseFeatureFlag(serverValue ?? publicValue);
  if (explicitValue !== null) return explicitValue;

  return true;
}

export function isAdStudioEnabled() {
  return resolveAdStudioEnabled({
    serverValue: process.env.ENABLE_AD_STUDIO,
    publicValue: process.env.NEXT_PUBLIC_ENABLE_AD_STUDIO,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF,
  });
}
