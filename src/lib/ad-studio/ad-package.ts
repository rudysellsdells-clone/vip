export const AD_PACKAGE_VERSION = "h1.17";

export type AdPackageChannel = "google_search" | "meta" | "linkedin";
export type AdPackageStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "exported"
  | "archived";

export type AdChannelDefinition = {
  channel: AdPackageChannel;
  label: string;
  assetType: "search_ad" | "facebook_post" | "linkedin_post";
  utmSource: "google" | "facebook" | "linkedin";
  utmMedium: "cpc" | "paid-social";
  packageKind: "search" | "paid_social";
};

export const AD_CHANNEL_DEFINITIONS: Record<
  AdPackageChannel,
  AdChannelDefinition
> = {
  google_search: {
    channel: "google_search",
    label: "Google Search",
    assetType: "search_ad",
    utmSource: "google",
    utmMedium: "cpc",
    packageKind: "search",
  },
  meta: {
    channel: "meta",
    label: "Meta",
    assetType: "facebook_post",
    utmSource: "facebook",
    utmMedium: "paid-social",
    packageKind: "paid_social",
  },
  linkedin: {
    channel: "linkedin",
    label: "LinkedIn",
    assetType: "linkedin_post",
    utmSource: "linkedin",
    utmMedium: "paid-social",
    packageKind: "paid_social",
  },
};

export type AdPackageAttribution = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string | null;
};

export type AdPackageStrategyContext = {
  strategySignature: string;
  marketIntelligenceSignature: string | null;
  strategySnapshot: Record<string, unknown>;
  evidenceSourceIds: string[];
};

export type SearchAdVariant = {
  kind: "search";
  name: string;
  headlines: string[];
  descriptions: string[];
  keywordThemes: string[];
  negativeKeywordThemes: string[];
  pathOne: string;
  pathTwo: string;
  callouts: string[];
  sitelinks: Array<{
    text: string;
    descriptionOne: string;
    descriptionTwo: string;
    destinationUrl: string;
  }>;
};

export type PaidSocialAdVariant = {
  kind: "paid_social";
  platform: "meta" | "linkedin";
  name: string;
  primaryText: string;
  headline: string;
  description: string;
  callToAction: string;
  audienceFrame: string;
  creativeBrief: string;
};

export type AdPackageVariant = SearchAdVariant | PaidSocialAdVariant;

export type AdPackage = {
  version: typeof AD_PACKAGE_VERSION;
  accountId: string;
  campaignId: string;
  campaignName: string;
  title: string;
  channel: AdPackageChannel;
  assetType: AdChannelDefinition["assetType"];
  packageKind: AdChannelDefinition["packageKind"];
  status: AdPackageStatus;
  objective: string;
  audience: string;
  offer: string;
  destinationUrl: string;
  strategy: AdPackageStrategyContext;
  attribution: AdPackageAttribution;
  variants: AdPackageVariant[];
  metadata: Record<string, unknown>;
};

export type CreateAdPackageDraftInput = {
  accountId: string;
  campaignId: string;
  campaignName: string;
  title?: string;
  channel: AdPackageChannel;
  objective: string;
  audience: string;
  offer: string;
  destinationUrl: string;
  strategy: AdPackageStrategyContext;
  attributionCampaign: string;
  attributionContent?: string;
  attributionTerm?: string | null;
  metadata?: Record<string, unknown>;
};

export type AdPackageReadiness = {
  ready: boolean;
  issues: string[];
};

function requiredText(value: unknown, label: string) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedUrl(value: unknown) {
  const text = requiredText(value, "Destination URL");

  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Destination URL must use http or https.");
    }
    url.hash = "";
    return url.toString();
  } catch (error) {
    if (error instanceof Error && error.message.includes("must use")) throw error;
    throw new Error("Destination URL must be a valid web address.");
  }
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function resolveAdChannelDefinition(value: unknown) {
  const channel = optionalText(value) as AdPackageChannel;
  const definition = AD_CHANNEL_DEFINITIONS[channel];
  if (!definition) throw new Error("Unsupported advertising channel.");
  return definition;
}

export function createAdPackageDraft(
  input: CreateAdPackageDraftInput,
): AdPackage {
  const definition = resolveAdChannelDefinition(input.channel);
  const campaignName = requiredText(input.campaignName, "Campaign name");
  const attributionCampaign = requiredText(
    input.attributionCampaign,
    "Attribution campaign",
  );

  return {
    version: AD_PACKAGE_VERSION,
    accountId: requiredText(input.accountId, "Account ID"),
    campaignId: requiredText(input.campaignId, "Campaign ID"),
    campaignName,
    title: optionalText(input.title) || `${campaignName} — ${definition.label}`,
    channel: definition.channel,
    assetType: definition.assetType,
    packageKind: definition.packageKind,
    status: "draft",
    objective: requiredText(input.objective, "Objective"),
    audience: requiredText(input.audience, "Audience"),
    offer: requiredText(input.offer, "Offer"),
    destinationUrl: normalizedUrl(input.destinationUrl),
    strategy: {
      strategySignature: requiredText(
        input.strategy.strategySignature,
        "Strategy signature",
      ),
      marketIntelligenceSignature:
        optionalText(input.strategy.marketIntelligenceSignature) || null,
      strategySnapshot: input.strategy.strategySnapshot ?? {},
      evidenceSourceIds: uniqueStrings(input.strategy.evidenceSourceIds ?? []),
    },
    attribution: {
      source: definition.utmSource,
      medium: definition.utmMedium,
      campaign: attributionCampaign,
      content:
        optionalText(input.attributionContent) ||
        `${definition.channel}-package`,
      term: optionalText(input.attributionTerm) || null,
    },
    variants: [],
    metadata: input.metadata ?? {},
  };
}

export function getAdPackageGenerationReadiness(
  value: Pick<
    AdPackage,
    | "objective"
    | "audience"
    | "offer"
    | "destinationUrl"
    | "strategy"
    | "attribution"
  >,
): AdPackageReadiness {
  const issues: string[] = [];

  if (!optionalText(value.objective)) issues.push("Campaign objective is missing.");
  if (!optionalText(value.audience)) issues.push("Approved audience is missing.");
  if (!optionalText(value.offer)) issues.push("Selected offer is missing.");
  if (!optionalText(value.destinationUrl)) issues.push("Destination URL is missing.");
  if (!optionalText(value.strategy.strategySignature)) {
    issues.push("Approved Marketing Spine signature is missing.");
  }
  if (!optionalText(value.attribution.campaign)) {
    issues.push("Attribution campaign name is missing.");
  }

  return { ready: issues.length === 0, issues };
}
