import type {
  BrandVoiceMonthlyOption,
  BrandVoiceMonthlyOptions,
} from "@/lib/accounts/brand-voice-monthly-options";
import type { StrategyFoundation } from "@/lib/strategy/strategy-foundation";

function text(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(items: string[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const cleaned = text(item);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function label(value: string) {
  return value.length > 72 ? `${value.slice(0, 69)}...` : value;
}

function options(
  values: string[],
  prefix: string,
  source: BrandVoiceMonthlyOption["source"],
): BrandVoiceMonthlyOption[] {
  return unique(values).map((value, index) => ({
    id: `${prefix}-${index}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`,
    label: label(value),
    value,
    source,
  }));
}

export function buildStrategyFoundationBrandVoiceOptions(
  foundation: StrategyFoundation,
): BrandVoiceMonthlyOptions {
  const market = foundation.market;
  const brand = foundation.brandExpression;
  const evidence = foundation.evidence;
  const defaults = foundation.campaignDefaults;

  const audiences = options(
    [
      ...market.audiences.map((audience) => audience.name),
      evidence.audienceSummary,
      defaults.targetAudience,
    ],
    "foundation-audience",
    "brand_profile",
  );
  const offers = options(
    [
      ...market.offers.map((offer) => offer.name),
      ...market.serviceLines.map((serviceLine) => serviceLine.name),
      evidence.offerSummary,
      defaults.primaryOffer,
    ],
    "foundation-offer",
    "brand_profile",
  );
  const tones = options(
    [
      brand.tone,
      brand.voiceSummary,
      ...brand.rules
        .filter((rule) => /tone|voice|style|human|professional|friendly|confident/i.test(rule.text))
        .map((rule) => rule.text),
    ],
    "foundation-tone",
    "brand_rule",
  );
  const ctas = options(
    [
      defaults.callToAction,
      foundation.businessTruth.primaryCta,
      ...market.offers.map((offer) => offer.primaryCta ?? ""),
    ],
    "foundation-cta",
    "brand_profile",
  );
  const differentiators = options(
    [
      defaults.differentiator,
      ...market.serviceLines.map((serviceLine) => serviceLine.primaryOutcome ?? ""),
      ...market.offers.map((offer) => offer.outcome ?? ""),
      evidence.businessSummary,
      brand.notes,
    ],
    "foundation-differentiator",
    "clone_profile",
  );
  const proofPoints = options(
    [
      defaults.proofPoints,
      evidence.salesOutcomeSummary,
      ...market.serviceLines.map((serviceLine) => serviceLine.description ?? ""),
      ...market.audiences.flatMap((audience) => audience.desiredOutcomes),
      ...market.offers.map((offer) => offer.description ?? ""),
    ],
    "foundation-proof",
    "clone_profile",
  );

  return {
    audiences,
    offers,
    tones,
    ctas,
    differentiators,
    proofPoints,
    businessContextDefault: defaults.businessContext,
    monthlyObjectiveDefault: [
      defaults.primaryOffer ? `Promote ${defaults.primaryOffer}.` : "",
      defaults.targetAudience ? `Primary audience: ${defaults.targetAudience}.` : "",
      defaults.callToAction ? `Drive action toward: ${defaults.callToAction}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function buildStrategyFoundationKnowledgeOptions(
  foundation: StrategyFoundation,
) {
  return foundation.evidence.knowledgeSources.map((source) => ({
    id: `knowledge-${source.id}`,
    label: `${source.title} (${source.sourceType})`,
    value: [
      `Knowledge source: ${source.title}`,
      `Type: ${source.sourceType}`,
      source.summary ? `Summary: ${source.summary}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    sourceType: "knowledge_source" as const,
  }));
}
