export type StrategyFoundationServiceLine = {
  id: string;
  name: string;
  shortName: string | null;
  description: string | null;
  primaryOutcome: string | null;
};

export type StrategyFoundationAudience = {
  id: string;
  name: string;
  description: string | null;
  commonPains: string[];
  desiredOutcomes: string[];
  objections: string[];
};

export type StrategyFoundationOffer = {
  id: string;
  serviceLineId: string | null;
  name: string;
  description: string | null;
  offerType: string | null;
  primaryCta: string | null;
  outcome: string | null;
  priceNotes: string | null;
  targetBuyerSegments: string[];
};

export type StrategyFoundationSource = {
  key: string;
  label: string;
  owner: "business" | "platform";
  status: "current" | "active" | "approved";
  count: number;
};

export type StrategyFoundation = {
  version: "1.0";
  accountId: string;
  accountName: string;
  generatedAt: string;
  businessTruth: {
    companyName: string;
    websiteUrl: string;
    primaryCta: string;
    phone: string;
    serviceAreas: string[];
  };
  brandExpression: {
    tone: string;
    voiceSummary: string;
    brandColors: string[];
    approvedHashtags: string[];
    notes: string;
    rules: Array<{
      text: string;
      category: string;
      priority: number | null;
    }>;
  };
  market: {
    serviceLines: StrategyFoundationServiceLine[];
    audiences: StrategyFoundationAudience[];
    offers: StrategyFoundationOffer[];
  };
  evidence: {
    businessSummary: string;
    audienceSummary: string;
    offerSummary: string;
    salesOutcomeSummary: string;
    knowledgeSources: Array<{
      id: string;
      title: string;
      sourceType: string;
      summary: string;
      updatedAt: string | null;
    }>;
    approvedExamples: Array<{
      id: string;
      title: string;
      contentType: string;
      source: string;
      updatedAt: string | null;
    }>;
  };
  campaignDefaults: {
    targetAudience: string;
    primaryOffer: string;
    tone: string;
    callToAction: string;
    differentiator: string;
    proofPoints: string;
    businessContext: string;
  };
  readiness: {
    score: number;
    campaignReady: boolean;
    missing: string[];
    completedChecks: number;
    totalChecks: number;
  };
  sources: StrategyFoundationSource[];
};

export type StrategyFoundationInput = {
  accountId: string;
  account?: Record<string, unknown> | null;
  brandProfile?: Record<string, unknown> | null;
  cloneProfile?: Record<string, unknown> | null;
  brandRules?: Array<Record<string, unknown>> | null;
  serviceLines?: StrategyFoundationServiceLine[] | null;
  audiences?: StrategyFoundationAudience[] | null;
  offers?: StrategyFoundationOffer[] | null;
  knowledgeSources?: Array<Record<string, unknown>> | null;
  approvedExamples?: Array<Record<string, unknown>> | null;
  generatedAt?: string;
};

function text(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function list(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(text).filter(Boolean);
  }

  const raw = text(value);
  if (!raw) return [];

  return raw
    .split(/\r?\n|;|,/)
    .map((item) => item.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

function unique(items: string[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function first(...values: unknown[]) {
  for (const value of values) {
    const candidate = text(value);
    if (candidate) return candidate;
  }
  return "";
}

function join(parts: Array<string | null | undefined>) {
  return parts.map(text).filter(Boolean).join("\n");
}

export function buildApprovedStrategyFoundation({
  accountId,
  account = null,
  brandProfile = null,
  cloneProfile = null,
  brandRules = [],
  serviceLines = [],
  audiences = [],
  offers = [],
  knowledgeSources = [],
  approvedExamples = [],
  generatedAt = new Date().toISOString(),
}: StrategyFoundationInput): StrategyFoundation {
  const accountRow = account ?? {};
  const brand = brandProfile ?? {};
  const clone = cloneProfile ?? {};
  const rules = brandRules ?? [];
  const services = serviceLines ?? [];
  const audienceRows = audiences ?? [];
  const offerRows = offers ?? [];
  const knowledgeRows = knowledgeSources ?? [];
  const exampleRows = approvedExamples ?? [];

  const companyName = first(brand.company_name, accountRow.name, accountRow.company_name);
  const websiteUrl = first(brand.website_url, accountRow.website_url);
  const primaryCta = first(brand.primary_cta, accountRow.primary_cta);
  const phone = first(brand.phone);
  const serviceAreas = unique(list(brand.service_areas));
  const tone = first(brand.tone, clone.voice_summary);
  const voiceSummary = first(clone.voice_summary, brand.tone);
  const brandColors = unique(list(brand.brand_colors));
  const approvedHashtags = unique(list(brand.approved_hashtags));
  const notes = first(brand.notes);

  const normalizedRules = rules
    .map((rule) => ({
      text: text(rule.rule_text),
      category: text(rule.category) || "general",
      priority:
        rule.priority === null || rule.priority === undefined
          ? null
          : Number(rule.priority),
    }))
    .filter((rule) => rule.text);

  const businessSummary = first(clone.business_summary, notes);
  const audienceSummary = first(
    clone.audience_summary,
    brand.target_audience,
    audienceRows[0]?.description,
    audienceRows[0]?.name,
  );
  const offerSummary = first(
    clone.offer_summary,
    brand.core_offers,
    offerRows[0]?.description,
    offerRows[0]?.name,
  );
  const salesOutcomeSummary = first(clone.sales_outcome_summary);

  const targetAudience = first(audienceRows[0]?.name, brand.target_audience, clone.audience_summary);
  const primaryOffer = first(offerRows[0]?.name, brand.core_offers, clone.offer_summary, services[0]?.name);
  const callToAction = first(offerRows[0]?.primaryCta, primaryCta);
  const differentiator = first(
    services[0]?.primaryOutcome,
    offerRows[0]?.outcome,
    salesOutcomeSummary,
    notes,
  );

  const proofPoints = join([
    services[0]?.description
      ? `Service context: ${services[0]?.description}`
      : "",
    services[0]?.primaryOutcome
      ? `Primary outcome: ${services[0]?.primaryOutcome}`
      : "",
    audienceRows[0]?.desiredOutcomes.length
      ? `Desired outcomes: ${audienceRows[0]?.desiredOutcomes.join("; ")}`
      : "",
    offerRows[0]?.description
      ? `Offer details: ${offerRows[0]?.description}`
      : "",
    offerRows[0]?.outcome ? `Offer outcome: ${offerRows[0]?.outcome}` : "",
    salesOutcomeSummary ? `Business outcomes: ${salesOutcomeSummary}` : "",
  ]);

  const businessContext = join([
    companyName ? `Brand: ${companyName}` : "",
    websiteUrl ? `Website: ${websiteUrl}` : "",
    businessSummary ? `Business summary: ${businessSummary}` : "",
    serviceAreas.length ? `Service areas: ${serviceAreas.join(", ")}` : "",
  ]);

  const checks = [
    { complete: Boolean(companyName), label: "Company or brand name" },
    { complete: Boolean(websiteUrl), label: "Website" },
    { complete: Boolean(primaryCta || callToAction), label: "Primary call to action" },
    { complete: Boolean(tone || normalizedRules.length), label: "Brand voice or rules" },
    { complete: services.length > 0, label: "At least one service line" },
    { complete: audienceRows.length > 0, label: "At least one audience" },
    { complete: offerRows.length > 0, label: "At least one offer" },
    { complete: Boolean(differentiator), label: "Differentiator or promised outcome" },
    { complete: knowledgeRows.length > 0, label: "At least one knowledge source" },
    { complete: exampleRows.length > 0, label: "At least one approved content example" },
  ];
  const completedChecks = checks.filter((check) => check.complete).length;
  const campaignReady = services.length > 0 && audienceRows.length > 0 && offerRows.length > 0;

  return {
    version: "1.0",
    accountId,
    accountName: companyName || "Untitled Account",
    generatedAt,
    businessTruth: {
      companyName,
      websiteUrl,
      primaryCta,
      phone,
      serviceAreas,
    },
    brandExpression: {
      tone,
      voiceSummary,
      brandColors,
      approvedHashtags,
      notes,
      rules: normalizedRules,
    },
    market: {
      serviceLines: services,
      audiences: audienceRows,
      offers: offerRows,
    },
    evidence: {
      businessSummary,
      audienceSummary,
      offerSummary,
      salesOutcomeSummary,
      knowledgeSources: knowledgeRows.map((row) => ({
        id: text(row.id),
        title: text(row.title) || "Untitled knowledge source",
        sourceType: text(row.source_type) || "knowledge",
        summary: first(row.summary, row.content),
        updatedAt: text(row.updated_at) || null,
      })),
      approvedExamples: exampleRows.map((row) => ({
        id: text(row.id),
        title: text(row.title) || "Untitled example",
        contentType: text(row.content_type) || "content",
        source: text(row.source),
        updatedAt: text(row.updated_at) || null,
      })),
    },
    campaignDefaults: {
      targetAudience,
      primaryOffer,
      tone,
      callToAction,
      differentiator,
      proofPoints,
      businessContext,
    },
    readiness: {
      score: Math.round((completedChecks / checks.length) * 100),
      campaignReady,
      missing: checks.filter((check) => !check.complete).map((check) => check.label),
      completedChecks,
      totalChecks: checks.length,
    },
    sources: [
      {
        key: "account_brand_profile",
        label: "Account brand profile",
        owner: "business",
        status: "current",
        count: brandProfile ? 1 : 0,
      },
      {
        key: "structured_market_strategy",
        label: "Services, audiences, and offers",
        owner: "business",
        status: "active",
        count: services.length + audienceRows.length + offerRows.length,
      },
      {
        key: "brand_rules",
        label: "Brand rules",
        owner: "business",
        status: "active",
        count: normalizedRules.length,
      },
      {
        key: "digital_clone",
        label: "Digital clone profile",
        owner: "business",
        status: "active",
        count: cloneProfile ? 1 : 0,
      },
      {
        key: "knowledge_sources",
        label: "Knowledge sources",
        owner: "business",
        status: "active",
        count: knowledgeRows.length,
      },
      {
        key: "approved_examples",
        label: "Approved content examples",
        owner: "business",
        status: "approved",
        count: exampleRows.length,
      },
    ],
  };
}
