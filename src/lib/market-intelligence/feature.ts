export function isMarketIntelligenceEnabled() {
  const value =
    process.env.ENABLE_MARKET_INTELLIGENCE ??
    process.env.NEXT_PUBLIC_ENABLE_MARKET_INTELLIGENCE ??
    "true";
  const normalized = value.trim().toLowerCase();
  return normalized !== "0" && normalized !== "false" && normalized !== "no";
}
