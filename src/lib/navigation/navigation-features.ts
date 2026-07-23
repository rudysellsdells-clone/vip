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
  const isMarketIntelligencePreview =
    process.env.VERCEL_GIT_COMMIT_REF === "h1-15-market-intelligence";

  return {
    marketIntelligence:
      process.env.NEXT_PUBLIC_ENABLE_MARKET_INTELLIGENCE ??
      (isMarketIntelligencePreview ? "true" : undefined),
    adStudio: process.env.NEXT_PUBLIC_ENABLE_AD_STUDIO,
    videoStudio: process.env.NEXT_PUBLIC_ENABLE_VIDEO_STUDIO,
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
