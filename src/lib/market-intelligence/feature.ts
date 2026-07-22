export function isMarketIntelligenceEnabled() {
  const value =
    process.env.ENABLE_MARKET_INTELLIGENCE ??
    process.env.NEXT_PUBLIC_ENABLE_MARKET_INTELLIGENCE;
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}
