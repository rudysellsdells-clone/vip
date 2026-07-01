import type { MonthlyCampaignStrategyInput } from "@/lib/content-calendar/monthly-campaign-planner";

type SupabaseLike = {
  from: (table: string) => any;
};

export type AccountServiceLineOption = {
  id: string;
  name: string;
  shortName: string | null;
  description: string | null;
  primaryOutcome: string | null;
};

export type AccountAudienceOption = {
  id: string;
  name: string;
  description: string | null;
  commonPains: string[];
  desiredOutcomes: string[];
  objections: string[];
};

export type AccountOfferOption = {
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

export type AccountMarketProfile = {
  serviceLines: AccountServiceLineOption[];
  audiences: AccountAudienceOption[];
  offers: AccountOfferOption[];
};

export type AccountMarketProfileSelection = {
  serviceLineId?: string | null;
  audienceId?: string | null;
  offerId?: string | null;
};

export type ResolvedAccountMarketProfile = {
  serviceLine: AccountServiceLineOption | null;
  audience: AccountAudienceOption | null;
  offer: AccountOfferOption | null;
  strategyDefaults: MonthlyCampaignStrategyInput;
  businessContext: string;
  metadata: {
    selectedServiceLineId: string | null;
    selectedServiceLineName: string | null;
    selectedAudienceId: string | null;
    selectedAudienceName: string | null;
    selectedOfferId: string | null;
    selectedOfferName: string | null;
  };
};

function asTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function joinParts(parts: Array<string | null | undefined>, separator = "\n") {
  return parts
    .map((part) => clean(part))
    .filter(Boolean)
    .join(separator);
}

export async function fetchAccountMarketProfile({
  supabase,
  accountId,
}: {
  supabase: SupabaseLike;
  accountId: string | null | undefined;
}): Promise<AccountMarketProfile> {
  if (!accountId) {
    return { serviceLines: [], audiences: [], offers: [] };
  }

  const [serviceLinesResult, audiencesResult, offersResult] = await Promise.all(
    [
      supabase
        .from("service_lines")
        .select("id,name,short_name,description,primary_outcome,sort_order")
        .eq("account_id", accountId)
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("buyer_segments")
        .select(
          "id,name,description,common_pains,desired_outcomes,objections,sort_order",
        )
        .eq("account_id", accountId)
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("offers")
        .select(
          "id,service_line_id,name,description,offer_type,primary_cta,outcome,price_notes,target_buyer_segments,created_at",
        )
        .eq("account_id", accountId)
        .eq("active", true)
        .order("created_at", { ascending: true }),
    ],
  );

  return {
    serviceLines: (
      (serviceLinesResult.data ?? []) as Record<string, unknown>[]
    ).map((row) => ({
      id: String(row.id),
      name: clean(row.name),
      shortName: row.short_name ? clean(row.short_name) : null,
      description: row.description ? clean(row.description) : null,
      primaryOutcome: row.primary_outcome ? clean(row.primary_outcome) : null,
    })),
    audiences: ((audiencesResult.data ?? []) as Record<string, unknown>[]).map(
      (row) => ({
        id: String(row.id),
        name: clean(row.name),
        description: row.description ? clean(row.description) : null,
        commonPains: asTextArray(row.common_pains),
        desiredOutcomes: asTextArray(row.desired_outcomes),
        objections: asTextArray(row.objections),
      }),
    ),
    offers: ((offersResult.data ?? []) as Record<string, unknown>[]).map(
      (row) => ({
        id: String(row.id),
        serviceLineId: row.service_line_id ? clean(row.service_line_id) : null,
        name: clean(row.name),
        description: row.description ? clean(row.description) : null,
        offerType: row.offer_type ? clean(row.offer_type) : null,
        primaryCta: row.primary_cta ? clean(row.primary_cta) : null,
        outcome: row.outcome ? clean(row.outcome) : null,
        priceNotes: row.price_notes ? clean(row.price_notes) : null,
        targetBuyerSegments: asTextArray(row.target_buyer_segments),
      }),
    ),
  };
}

export function resolveAccountMarketProfile({
  profile,
  selection,
}: {
  profile: AccountMarketProfile;
  selection?: AccountMarketProfileSelection;
}): ResolvedAccountMarketProfile {
  const selectedOffer =
    profile.offers.find((offer) => offer.id === selection?.offerId) ??
    profile.offers[0] ??
    null;

  const selectedServiceLine =
    profile.serviceLines.find(
      (serviceLine) => serviceLine.id === selection?.serviceLineId,
    ) ??
    (selectedOffer?.serviceLineId
      ? profile.serviceLines.find(
          (serviceLine) => serviceLine.id === selectedOffer.serviceLineId,
        )
      : null) ??
    profile.serviceLines[0] ??
    null;

  const selectedAudience =
    profile.audiences.find(
      (audience) => audience.id === selection?.audienceId,
    ) ??
    profile.audiences[0] ??
    null;

  const keyTopics = [
    selectedServiceLine?.name,
    selectedServiceLine?.primaryOutcome,
    selectedAudience?.commonPains?.[0]
      ? `How to solve ${selectedAudience.commonPains[0]}`
      : "",
    selectedOffer?.outcome,
    selectedOffer?.name,
  ].filter(Boolean) as string[];

  const proofPoints = joinParts(
    [
      selectedServiceLine?.description
        ? `Service context: ${selectedServiceLine.description}`
        : "",
      selectedServiceLine?.primaryOutcome
        ? `Primary outcome: ${selectedServiceLine.primaryOutcome}`
        : "",
      selectedAudience?.description
        ? `Audience context: ${selectedAudience.description}`
        : "",
      selectedAudience?.commonPains?.length
        ? `Audience pain points: ${selectedAudience.commonPains.join("; ")}`
        : "",
      selectedAudience?.desiredOutcomes?.length
        ? `Desired outcomes: ${selectedAudience.desiredOutcomes.join("; ")}`
        : "",
      selectedAudience?.objections?.length
        ? `Common objections: ${selectedAudience.objections.join("; ")}`
        : "",
      selectedOffer?.description
        ? `Offer details: ${selectedOffer.description}`
        : "",
      selectedOffer?.outcome ? `Offer outcome: ${selectedOffer.outcome}` : "",
      selectedOffer?.priceNotes
        ? `Price/package notes: ${selectedOffer.priceNotes}`
        : "",
    ],
    "\n",
  );

  const strategyDefaults: MonthlyCampaignStrategyInput = {
    monthlyObjective: selectedOffer
      ? `Promote ${selectedOffer.name}${selectedServiceLine ? ` for ${selectedServiceLine.name}` : ""}${selectedAudience ? ` to ${selectedAudience.name}` : ""}.`
      : selectedServiceLine
        ? `Build demand for ${selectedServiceLine.name}${selectedAudience ? ` with ${selectedAudience.name}` : ""}.`
        : "",
    targetAudience: selectedAudience?.name ?? "",
    primaryOffer: selectedOffer?.name ?? selectedServiceLine?.name ?? "",
    keyTopics: keyTopics.join("\n"),
    tone: "",
    callToAction: selectedOffer?.primaryCta ?? "",
    differentiator:
      selectedServiceLine?.primaryOutcome ?? selectedOffer?.outcome ?? "",
    proofPoints,
    originalityAngle: "",
    objections: selectedAudience?.objections?.join("\n") ?? "",
  };

  const businessContext = joinParts(
    [
      selectedServiceLine
        ? `Selected service line: ${selectedServiceLine.name}${selectedServiceLine.description ? ` — ${selectedServiceLine.description}` : ""}`
        : "",
      selectedAudience
        ? `Selected audience: ${selectedAudience.name}${selectedAudience.description ? ` — ${selectedAudience.description}` : ""}`
        : "",
      selectedOffer
        ? `Selected offer: ${selectedOffer.name}${selectedOffer.description ? ` — ${selectedOffer.description}` : ""}`
        : "",
    ],
    "\n",
  );

  return {
    serviceLine: selectedServiceLine,
    audience: selectedAudience,
    offer: selectedOffer,
    strategyDefaults,
    businessContext,
    metadata: {
      selectedServiceLineId: selectedServiceLine?.id ?? null,
      selectedServiceLineName: selectedServiceLine?.name ?? null,
      selectedAudienceId: selectedAudience?.id ?? null,
      selectedAudienceName: selectedAudience?.name ?? null,
      selectedOfferId: selectedOffer?.id ?? null,
      selectedOfferName: selectedOffer?.name ?? null,
    },
  };
}

export function mergeStrategyWithMarketDefaults({
  entered,
  defaults,
}: {
  entered: MonthlyCampaignStrategyInput;
  defaults: MonthlyCampaignStrategyInput;
}): MonthlyCampaignStrategyInput {
  return {
    monthlyObjective:
      clean(entered.monthlyObjective) || clean(defaults.monthlyObjective),
    targetAudience:
      clean(entered.targetAudience) || clean(defaults.targetAudience),
    primaryOffer: clean(entered.primaryOffer) || clean(defaults.primaryOffer),
    keyTopics: clean(entered.keyTopics) || clean(defaults.keyTopics),
    tone: clean(entered.tone) || clean(defaults.tone),
    callToAction: clean(entered.callToAction) || clean(defaults.callToAction),
    differentiator:
      clean(entered.differentiator) || clean(defaults.differentiator),
    proofPoints: clean(entered.proofPoints) || clean(defaults.proofPoints),
    originalityAngle:
      clean(entered.originalityAngle) || clean(defaults.originalityAngle),
    objections: clean(entered.objections) || clean(defaults.objections),
  };
}

export function marketProfileSummary(profile: AccountMarketProfile) {
  return {
    serviceLineCount: profile.serviceLines.length,
    audienceCount: profile.audiences.length,
    offerCount: profile.offers.length,
  };
}
