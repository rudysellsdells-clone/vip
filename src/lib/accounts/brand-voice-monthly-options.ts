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

function optionsFrom(
  items: string[],
  source: BrandVoiceMonthlyOption["source"],
  prefix: string,
  maxItems = 24,
) {
  return uniq(items).slice(0, maxItems).map((value, index) => ({
    id: `${prefix}-${index}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 36)}`,
    label: label(value),
    value,
    source,
  }));
}

function joinContext(parts: Array<string | null | undefined>) {
  return parts.map((part) => text(part)).filter(Boolean).join("\n\n");
}

function shortOfferActions(items: string[]) {
  return uniq(items).filter((item) => {
    const wordCount = item.split(/\s+/).filter(Boolean).length;
    return (
      wordCount <= 10 &&
      /\b(consult(?:ation)?|demo(?:nstration)?|audit|assessment|diagnostic|call|appointment|webinar|workshop|seminar|guide|checklist|playbook|ebook|template|trial|pilot|quote|estimate)\b/i.test(
        item,
      )
    );
  });
}

function ctaFromOffer(value: string) {
  const offer = value.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  if (!offer) return "";
  if (/\bconsult(?:ation)?\b/i.test(offer)) return `Schedule a ${offer}`;
  if (/\bdemo(?:nstration)?\b/i.test(offer)) return `Schedule a ${offer}`;
  if (/\b(?:audit|assessment|diagnostic)\b/i.test(offer)) return `Book a ${offer}`;
  if (/\b(?:webinar|workshop|seminar)\b/i.test(offer)) return `Register for the ${offer}`;
  if (/\b(?:guide|checklist|playbook|ebook|template)\b/i.test(offer)) return `Download the ${offer}`;
  if (/\b(?:trial|pilot)\b/i.test(offer)) return `Start the ${offer}`;
  if (/\b(?:quote|estimate)\b/i.test(offer)) return `Request a ${offer}`;
  return "";
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

  const rawOffers = [
    ...splitList(account.core_offers),
    ...splitList(clone.offer_summary),
  ];

  const offers = optionsFrom(
    rawOffers,
    "clone_profile",
    "offer",
    30,
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
      ...shortOfferActions(rawOffers).map(ctaFromOffer).filter(Boolean),
    ],
    "brand_profile",
    "cta",
    30,
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
