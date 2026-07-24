import { isAdStudioEnabled } from "../ad-studio/feature";
import { isVideoStudioEnabled } from "../video-studio/feature";

export const NAVIGATION_FEATURES = {
  marketIntelligence: "market-intelligence",
  adStudio: "ad-studio",
  videoStudio: "video-studio",
} as const;

export type NavigationFeature =
  (typeof NAVIGATION_FEATURES)[keyof typeof NAVIGATION_FEATURES];

type NavigationFeatureEnvironment = {
  marketIntelligence?: string;
  adStudio?: string;
  videoStudio?: string;
};

function isEnabled(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function defaultFeatureEnvironment(): NavigationFeatureEnvironment {
  return {
    marketIntelligence:
      process.env.ENABLE_MARKET_INTELLIGENCE ??
      process.env.NEXT_PUBLIC_ENABLE_MARKET_INTELLIGENCE ??
      "true",
    adStudio: isAdStudioEnabled() ? "true" : undefined,
    videoStudio: isVideoStudioEnabled() ? "true" : undefined,
  };
}

export function getEnabledNavigationFeatures(
  environment: NavigationFeatureEnvironment = defaultFeatureEnvironment(),
): ReadonlySet<NavigationFeature> {
  const enabled = new Set<NavigationFeature>();

  if (isEnabled(environment.marketIntelligence)) {
    enabled.add(NAVIGATION_FEATURES.marketIntelligence);
  }
  if (isEnabled(environment.adStudio)) {
    enabled.add(NAVIGATION_FEATURES.adStudio);
  }
  if (isEnabled(environment.videoStudio)) {
    enabled.add(NAVIGATION_FEATURES.videoStudio);
  }

  return enabled;
}
