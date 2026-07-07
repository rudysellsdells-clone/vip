export type BrandVoiceMonthlyOption = {
  id: string;
  label: string;
  value: string;
  source: "brand_profile" | "clone_profile" | "brand_rule";
};

export type BrandVoiceMonthlyOptions = {
  audiences: BrandVoiceMonthlyOption[];
  offers: BrandVoiceMonthlyOption[];
  tones: BrandVoiceMonthlyOption[];
  ctas: BrandVoiceMonthlyOption[];
  differentiators: BrandVoiceMonthlyOption[];
  proofPoints: BrandVoiceMonthlyOption[];
  businessContextDefault: string;
  monthlyObjectiveDefault: string;
};

type BrandVoiceInput = {
  cloneProfile?: Record<string, unknown> | null;
  accountBrandProfile?: Record<string, unknown> | null;
  brandRules?: Array<Record<string, unknown>> | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function label(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 72 ? `${cleaned.slice(0, 69)}...` : cleaned;
}

function splitList(value: unknown, options?: { preserveParagraph?: boolean }) {
  const raw = text(value);
  if (!raw) return [];

  const parts = raw
    .split(options?.preserveParagraph ? /\r?\n|;/ : /\r?\n|;|,/)
    .map((item) => item.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);

  if (parts.length <= 1) {
    return [raw];
  }

  return parts;
}

function uniq(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const cleaned = item.replace(/\s+/g, " ").trim();
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function optionsFrom(items: string[], source: BrandVoiceMonthlyOption["source"], prefix: string) {
  return uniq(items).slice(0, 12).map((value, index) => ({
    id: `${prefix}-${index}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`,
    label: label(value),
    value,
    source,
  }));
}

function joinContext(parts: Array<string | null | undefined>) {
  return parts.map((part) => text(part)).filter(Boolean).join("\n\n");
}

export function buildBrandVoiceMonthlyOptions({
  cloneProfile,
  accountBrandProfile,
  brandRules,
}: BrandVoiceInput): BrandVoiceMonthlyOptions {
  const account = accountBrandProfile ?? {};
  const clone = cloneProfile ?? {};
  const rules = brandRules ?? [];

  const ruleTexts = rules
    .map((rule) => text(rule.rule_text))
    .filter(Boolean);

  const audiences = optionsFrom(
    [
      ...splitList(account.target_audience),
      ...splitList(clone.audience_summary),
    ],
    "clone_profile",
    "audience",
  );

  const offers = optionsFrom(
    [
      ...splitList(account.core_offers),
      ...splitList(clone.offer_summary),
    ],
    "clone_profile",
    "offer",
  );

  const tones = optionsFrom(
    [
      ...splitList(account.tone),
      ...splitList(clone.voice_summary),
      ...ruleTexts.filter((rule) => /tone|voice|style|human|professional|confident|friendly/i.test(rule)),
    ],
    "clone_profile",
    "tone",
  );

  const ctas = optionsFrom(
    [
      ...splitList(account.primary_cta),
      ...splitList(clone.sales_outcome_summary, { preserveParagraph: true }),
    ],
    "brand_profile",
    "cta",
  );

  const differentiators = optionsFrom(
    [
      ...splitList(clone.business_summary, { preserveParagraph: true }),
      ...splitList(account.notes, { preserveParagraph: true }),
      ...ruleTexts.filter((rule) => /position|different|proof|avoid|must|always|never/i.test(rule)),
    ],
    "clone_profile",
    "differentiate",
  );

  const proofPoints = optionsFrom(
    [
      ...splitList(clone.sales_outcome_summary, { preserveParagraph: true }),
      ...splitList(account.notes, { preserveParagraph: true }),
      ...splitList(account.service_areas),
    ],
    "clone_profile",
    "proof",
  );

  const brandColors = Array.isArray(account.brand_colors)
    ? account.brand_colors.map((color) => text(color)).filter(Boolean).join(", ")
    : "";

  const businessContextDefault = joinContext([
    account.company_name ? `Brand: ${text(account.company_name)}` : null,
    account.website_url ? `Website: ${text(account.website_url)}` : null,
    brandColors ? `Brand colors: ${brandColors}` : null,
    account.logo_url ? "Logo: uploaded in the account brand profile." : null,
    clone.business_summary ? `Business summary: ${text(clone.business_summary)}` : null,
    account.service_areas ? `Service areas: ${text(account.service_areas)}` : null,
    account.notes ? `Brand notes: ${text(account.notes)}` : null,
  ]);

  const monthlyObjectiveDefault = joinContext([
    clone.sales_outcome_summary ? text(clone.sales_outcome_summary) : null,
    account.primary_cta ? `Drive action toward: ${text(account.primary_cta)}` : null,
  ]);

  return {
    audiences,
    offers,
    tones,
    ctas,
    differentiators,
    proofPoints,
    businessContextDefault,
    monthlyObjectiveDefault,
  };
}
