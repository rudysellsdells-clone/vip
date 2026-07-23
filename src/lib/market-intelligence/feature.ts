export function isMarketIntelligenceEnabled() {
  const isMarketIntelligencePreview =
    process.env.VERCEL_GIT_COMMIT_REF === "h1-15-market-intelligence";
  const value =
    process.env.ENABLE_MARKET_INTELLIGENCE ??
    process.env.NEXT_PUBLIC_ENABLE_MARKET_INTELLIGENCE ??
    (isMarketIntelligencePreview ? "true" : undefined);
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}
