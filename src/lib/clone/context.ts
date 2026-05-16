import { createClient } from "@/lib/supabase/server";

export type DigitalCloneContext = {
  profile: unknown | null;
  brandRules: unknown[];
  contentExamples: unknown[];
  knowledgeSources: unknown[];
  serviceLines: unknown[];
  buyerSegments: unknown[];
  offers: unknown[];
  formattedContext: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function formatArraySection(title: string, items: string[]) {
  if (!items.length) {
    return "";
  }

  return [`## ${title}`, ...items.map((item) => `- ${item}`)].join("\n");
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength).trim()}...`;
}

function formatProfile(profile: unknown) {
  if (!isRecord(profile)) {
    return "";
  }

  return [
    "## Digital Clone Profile",
    `Name: ${getString(profile.name)}`,
    `Purpose: ${getString(profile.purpose)}`,
    `Voice: ${getString(profile.voice_summary)}`,
    `Business: ${getString(profile.business_summary)}`,
    `Audience: ${getString(profile.audience_summary)}`,
    `Offers: ${getString(profile.offer_summary)}`,
    `Sales Outcomes: ${getString(profile.sales_outcome_summary)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatBrandRules(rules: unknown[]) {
  return formatArraySection(
    "Brand Rules",
    rules
      .filter(isRecord)
      .map((rule) => getString(rule.rule_text))
      .filter(Boolean)
  );
}

function formatServiceLines(serviceLines: unknown[]) {
  return formatArraySection(
    "Service Lines",
    serviceLines.filter(isRecord).map((service) => {
      const name = getString(service.name);
      const outcome = getString(service.primary_outcome);
      const description = getString(service.description);

      return [name, outcome, description].filter(Boolean).join(" — ");
    })
  );
}

function formatBuyerSegments(buyerSegments: unknown[]) {
  return formatArraySection(
    "Buyer Segments",
    buyerSegments.filter(isRecord).map((segment) => {
      const name = getString(segment.name);
      const description = getString(segment.description);

      return [name, description].filter(Boolean).join(" — ");
    })
  );
}

function formatOffers(offers: unknown[]) {
  return formatArraySection(
    "Offers",
    offers.filter(isRecord).map((offer) => {
      const name = getString(offer.name);
      const outcome = getString(offer.outcome);
      const cta = getString(offer.primary_cta);

      return [name, outcome, cta ? `CTA: ${cta}` : ""].filter(Boolean).join(" — ");
    })
  );
}

function formatContentExamples(examples: unknown[]) {
  return formatArraySection(
    "Approved Content Examples",
    examples.filter(isRecord).map((example) => {
      const title = getString(example.title);
      const type = getString(example.content_type);
      const content = truncate(getString(example.content), 700);

      return [`${title} (${type})`, content].filter(Boolean).join("\n");
    })
  );
}

function formatKnowledgeSources(sources: unknown[]) {
  return formatArraySection(
    "Knowledge Library",
    sources.filter(isRecord).map((source) => {
      const title = getString(source.title);
      const type = getString(source.source_type);
      const summary = getString(source.summary);
      const content = truncate(getString(source.content), 900);

      return [`${title} (${type})`, summary, content].filter(Boolean).join("\n");
    })
  );
}

export function formatDigitalCloneContext(input: {
  profile: unknown | null;
  brandRules: unknown[];
  contentExamples: unknown[];
  knowledgeSources: unknown[];
  serviceLines: unknown[];
  buyerSegments: unknown[];
  offers: unknown[];
}) {
  return [
    formatProfile(input.profile),
    formatBrandRules(input.brandRules),
    formatServiceLines(input.serviceLines),
    formatBuyerSegments(input.buyerSegments),
    formatOffers(input.offers),
    formatContentExamples(input.contentExamples),
    formatKnowledgeSources(input.knowledgeSources),
  ]
    .filter((section) => section.trim().length > 0)
    .join("\n\n");
}

export async function loadDigitalCloneContext(userId: string): Promise<DigitalCloneContext> {
  const supabase = await createClient();

  const [
    profileResult,
    brandRulesResult,
    contentExamplesResult,
    knowledgeSourcesResult,
    serviceLinesResult,
    buyerSegmentsResult,
    offersResult,
  ] = await Promise.all([
    supabase
      .from("digital_clone_profiles")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("brand_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true }),

    supabase
      .from("content_examples")
      .select("*")
      .eq("user_id", userId)
      .eq("approved", true)
      .order("updated_at", { ascending: false })
      .limit(12),

    supabase
      .from("knowledge_sources")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(12),

    supabase
      .from("service_lines")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("sort_order", { ascending: true }),

    supabase
      .from("buyer_segments")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("sort_order", { ascending: true }),

    supabase
      .from("offers")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResult.data ?? null;
  const brandRules = brandRulesResult.data ?? [];
  const contentExamples = contentExamplesResult.data ?? [];
  const knowledgeSources = knowledgeSourcesResult.data ?? [];
  const serviceLines = serviceLinesResult.data ?? [];
  const buyerSegments = buyerSegmentsResult.data ?? [];
  const offers = offersResult.data ?? [];

  return {
    profile,
    brandRules,
    contentExamples,
    knowledgeSources,
    serviceLines,
    buyerSegments,
    offers,
    formattedContext: formatDigitalCloneContext({
      profile,
      brandRules,
      contentExamples,
      knowledgeSources,
      serviceLines,
      buyerSegments,
      offers,
    }),
  };
}
