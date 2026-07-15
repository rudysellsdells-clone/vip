export const VIP_UTM_TAXONOMY_VERSION = "h1.7c2";

export type UtmTaxonomySettings = {
  account_id?: string | null;
  taxonomy_version?: string | null;
  default_email_source?: string | null;
  default_website_source?: string | null;
  default_sms_source?: string | null;
  include_audience_term?: boolean | null;
  append_link_to_social?: boolean | null;
  append_link_to_email?: boolean | null;
  source_overrides?: Record<string, unknown> | null;
  medium_overrides?: Record<string, unknown> | null;
};

export type PublishingAttributionContext = {
  account: Record<string, unknown> | null;
  campaign: Record<string, unknown> | null;
  settings: UtmTaxonomySettings;
};

export type PublishingAttribution = {
  ready: boolean;
  reason: string | null;
  channel: string;
  destinationUrl: string | null;
  trackedUrl: string | null;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string | null;
  vipCampaign: string | null;
  vipAsset: string;
  taxonomyVersion: string;
  appendedToContent: boolean;
};

const MEDIUM_ALLOWLIST = new Set([
  "organic-social",
  "paid-social",
  "cpc",
  "display",
  "email",
  "sms",
  "organic-search",
  "referral",
  "affiliate",
  "video",
  "qr",
  "direct-mail",
]);

const SOCIAL_ASSET_TYPES = new Set([
  "linkedin_post",
  "facebook_post",
  "instagram_post",
  "x_post",
  "twitter_post",
  "social_post",
]);

const CONTENT_PARAM_KEYS = [
  "content",
  "message",
  "text",
  "comment",
  "body",
  "body_plain",
  "email_body",
  "post_content",
];

function recordValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function firstText(...values: unknown[]) {
  return values.map(stringValue).find(Boolean) ?? "";
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    stringValue(value),
  );
}

export function normalizeUtmToken(value: unknown, fallback = "", maxLength = 100) {
  const normalized = stringValue(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return normalized || fallback;
}

export function defaultUtmTaxonomySettings(
  accountId?: string | null,
): Required<Omit<UtmTaxonomySettings, "source_overrides" | "medium_overrides">> & {
  source_overrides: Record<string, unknown>;
  medium_overrides: Record<string, unknown>;
} {
  return {
    account_id: accountId ?? null,
    taxonomy_version: VIP_UTM_TAXONOMY_VERSION,
    default_email_source: "email",
    default_website_source: "website",
    default_sms_source: "sms",
    include_audience_term: true,
    append_link_to_social: true,
    append_link_to_email: true,
    source_overrides: {},
    medium_overrides: {},
  };
}

export function mergeUtmTaxonomySettings(
  value: UtmTaxonomySettings | null | undefined,
  accountId?: string | null,
) {
  const defaults = defaultUtmTaxonomySettings(accountId);

  return {
    ...defaults,
    ...(value ?? {}),
    account_id: stringValue(value?.account_id) || accountId || null,
    taxonomy_version: stringValue(value?.taxonomy_version) || VIP_UTM_TAXONOMY_VERSION,
    default_email_source: normalizeUtmToken(value?.default_email_source, "email", 60),
    default_website_source: normalizeUtmToken(value?.default_website_source, "website", 60),
    default_sms_source: normalizeUtmToken(value?.default_sms_source, "sms", 60),
    include_audience_term: booleanValue(value?.include_audience_term, true),
    append_link_to_social: booleanValue(value?.append_link_to_social, true),
    append_link_to_email: booleanValue(value?.append_link_to_email, true),
    source_overrides: recordValue(value?.source_overrides),
    medium_overrides: recordValue(value?.medium_overrides),
  };
}

function paidDistribution(asset: Record<string, unknown>) {
  const metadata = recordValue(asset.metadata);
  const combined = [
    asset.distribution_type,
    asset.promotion_type,
    asset.channel,
    metadata.distributionType,
    metadata.promotionType,
    metadata.placementType,
  ]
    .map((value) => stringValue(value).toLowerCase())
    .join(" ");

  return (
    asset.is_paid === true ||
    metadata.isPaid === true ||
    /\b(paid|ad|advertisement|sponsored|boosted)\b/.test(combined)
  );
}

function sourceMediumDefaults({
  asset,
  settings,
  channel,
}: {
  asset: Record<string, unknown>;
  settings: ReturnType<typeof mergeUtmTaxonomySettings>;
  channel: string;
}) {
  const assetType = stringValue(asset.asset_type).toLowerCase();
  const paid = paidDistribution(asset);

  const defaults: Record<string, { source: string; medium: string }> = {
    linkedin_post: { source: "linkedin", medium: paid ? "paid-social" : "organic-social" },
    facebook_post: { source: "facebook", medium: paid ? "paid-social" : "organic-social" },
    instagram_post: { source: "instagram", medium: paid ? "paid-social" : "organic-social" },
    x_post: { source: "x", medium: paid ? "paid-social" : "organic-social" },
    twitter_post: { source: "x", medium: paid ? "paid-social" : "organic-social" },
    social_post: { source: normalizeUtmToken(channel, "social"), medium: paid ? "paid-social" : "organic-social" },
    email: { source: settings.default_email_source, medium: "email" },
    sms: { source: settings.default_sms_source, medium: "sms" },
    blog_post: { source: settings.default_website_source, medium: "referral" },
    video_script: { source: normalizeUtmToken(channel, "youtube"), medium: "video" },
    qr_code: { source: "qr", medium: "qr" },
    display_ad: { source: normalizeUtmToken(channel, "display"), medium: "display" },
    search_ad: { source: normalizeUtmToken(channel, "google"), medium: "cpc" },
  };

  return defaults[assetType] ?? {
    source: normalizeUtmToken(channel, "vip"),
    medium: "referral",
  };
}

function overrideFor(
  overrides: Record<string, unknown>,
  assetType: string,
  channel: string,
) {
  return firstText(overrides[assetType], overrides[channel], overrides.default);
}

function resolvedSourceMedium({
  asset,
  settings,
  channel,
}: {
  asset: Record<string, unknown>;
  settings: ReturnType<typeof mergeUtmTaxonomySettings>;
  channel: string;
}) {
  const assetType = stringValue(asset.asset_type).toLowerCase();
  const metadata = recordValue(asset.metadata);
  const analytics = recordValue(metadata.analytics);
  const defaults = sourceMediumDefaults({ asset, settings, channel });

  const source = normalizeUtmToken(
    firstText(
      analytics.utm_source,
      metadata.utmSource,
      asset.utm_source,
      overrideFor(settings.source_overrides, assetType, channel),
      defaults.source,
    ),
    defaults.source,
    60,
  );

  const requestedMedium = normalizeUtmToken(
    firstText(
      analytics.utm_medium,
      metadata.utmMedium,
      asset.utm_medium,
      overrideFor(settings.medium_overrides, assetType, channel),
      defaults.medium,
    ),
    defaults.medium,
    60,
  );

  return {
    source,
    medium: MEDIUM_ALLOWLIST.has(requestedMedium) ? requestedMedium : defaults.medium,
  };
}

function validHttpUrl(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractUrls(content: string) {
  const matches = content.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const result: string[] = [];

  for (const match of matches) {
    const cleaned = match.replace(/[),.;!?\]}]+$/g, "");
    const valid = validHttpUrl(cleaned);
    if (valid && !result.includes(valid)) result.push(valid);
  }

  return result;
}

function contentFromParams(params: Record<string, unknown>, asset: Record<string, unknown>) {
  const values = CONTENT_PARAM_KEYS.map((key) => params[key]);
  return firstText(...values, asset.content);
}

function explicitDestinationCandidates(
  asset: Record<string, unknown>,
  context: PublishingAttributionContext,
) {
  const metadata = recordValue(asset.metadata);
  const analytics = recordValue(metadata.analytics);
  const campaign = context.campaign ?? {};

  return [
    analytics.destination_url,
    analytics.destinationUrl,
    metadata.trackingDestinationUrl,
    metadata.analyticsDestinationUrl,
    metadata.destinationUrl,
    metadata.landingPageUrl,
    metadata.ctaUrl,
    metadata.primaryCtaUrl,
    metadata.bookingUrl,
    metadata.targetUrl,
    asset.destination_url,
    asset.landing_page_url,
    asset.cta_url,
    asset.primary_cta_url,
    asset.booking_url,
    campaign.destination_url,
    campaign.landing_page_url,
    campaign.cta_url,
    campaign.primary_cta_url,
  ];
}

function fallbackDestinationCandidates(
  asset: Record<string, unknown>,
  context: PublishingAttributionContext,
) {
  const publishingSettings = recordValue(asset.account_publishing_settings);
  const account = context.account ?? {};

  return [
    publishingSettings.primary_booking_url,
    account.primary_cta,
    account.website_url,
  ];
}

function resolveDestinationUrl({
  asset,
  context,
  params,
}: {
  asset: Record<string, unknown>;
  context: PublishingAttributionContext;
  params: Record<string, unknown>;
}) {
  for (const candidate of explicitDestinationCandidates(asset, context)) {
    const valid = validHttpUrl(candidate);
    if (valid) return valid;
  }

  const content = contentFromParams(params, asset);
  const contentUrl = extractUrls(content)[0];
  if (contentUrl) return contentUrl;

  for (const candidate of fallbackDestinationCandidates(asset, context)) {
    const valid = validHttpUrl(candidate);
    if (valid) return valid;
  }

  return null;
}

function campaignSlug(asset: Record<string, unknown>, context: PublishingAttributionContext) {
  const campaign = context.campaign ?? {};
  const metadata = recordValue(asset.metadata);
  const analytics = recordValue(metadata.analytics);

  return normalizeUtmToken(
    firstText(
      campaign.analytics_campaign_slug,
      analytics.utm_campaign,
      metadata.utmCampaign,
      asset.utm_campaign,
      campaign.name,
      campaign.title,
      asset.campaign_name,
      asset.title,
    ),
    "vip-campaign",
    100,
  );
}

function contentSlug(asset: Record<string, unknown>) {
  const metadata = recordValue(asset.metadata);
  const analytics = recordValue(metadata.analytics);
  const assetType = normalizeUtmToken(asset.asset_type, "asset", 40);
  const title = normalizeUtmToken(
    firstText(
      asset.analytics_content_slug,
      analytics.utm_content,
      metadata.utmContent,
      asset.utm_content,
      asset.title,
    ),
    assetType,
    72,
  );
  const version = normalizeUtmToken(
    firstText(asset.version_label, metadata.version, metadata.variant),
    "",
    20,
  );

  if (title.startsWith(`${assetType}-`) || title === assetType) {
    return version && !title.endsWith(`-${version}`) ? `${title}-${version}` : title;
  }

  const combined = `${assetType}-${title}${version ? `-${version}` : ""}`;
  return normalizeUtmToken(combined, assetType, 100);
}

function audienceTerm(asset: Record<string, unknown>, context: PublishingAttributionContext) {
  if (!context.settings.include_audience_term) return null;

  const campaign = context.campaign ?? {};
  const metadata = recordValue(asset.metadata);
  const analytics = recordValue(metadata.analytics);

  const term = normalizeUtmToken(
    firstText(
      analytics.utm_term,
      metadata.utmTerm,
      asset.utm_term,
      campaign.buyer_segment,
      campaign.audience,
      campaign.target_audience,
      asset.buyer_segment,
      asset.audience,
    ),
    "",
    100,
  );

  return term || null;
}

function addTrackingParameters({
  destinationUrl,
  attribution,
  includeStandardUtm,
}: {
  destinationUrl: string;
  attribution: Omit<PublishingAttribution, "trackedUrl" | "ready" | "reason" | "appendedToContent">;
  includeStandardUtm: boolean;
}) {
  const url = new URL(destinationUrl);

  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "vip_campaign",
    "vip_asset",
  ]) {
    url.searchParams.delete(key);
  }

  if (includeStandardUtm) {
    url.searchParams.set("utm_source", attribution.utmSource);
    url.searchParams.set("utm_medium", attribution.utmMedium);
    url.searchParams.set("utm_campaign", attribution.utmCampaign);
    url.searchParams.set("utm_content", attribution.utmContent);
    if (attribution.utmTerm) url.searchParams.set("utm_term", attribution.utmTerm);
  }

  if (attribution.vipCampaign) url.searchParams.set("vip_campaign", attribution.vipCampaign);
  url.searchParams.set("vip_asset", attribution.vipAsset);

  return url.toString();
}

function shouldAppendLink(
  assetType: string,
  settings: ReturnType<typeof mergeUtmTaxonomySettings>,
) {
  if (SOCIAL_ASSET_TYPES.has(assetType)) return settings.append_link_to_social;
  if (assetType === "email") return settings.append_link_to_email;
  return false;
}

function trackedContent({
  content,
  destinationUrl,
  trackedUrl,
  append,
}: {
  content: string;
  destinationUrl: string;
  trackedUrl: string;
  append: boolean;
}) {
  if (!content) return { content, changed: false, appended: false };

  const destinationWithoutSlash = destinationUrl.replace(/\/$/, "");
  const candidates = [destinationUrl];
  if (destinationWithoutSlash && destinationWithoutSlash !== destinationUrl) {
    candidates.push(destinationWithoutSlash);
  }

  for (const candidate of candidates) {
    if (content.includes(candidate)) {
      return {
        content: content.replaceAll(candidate, trackedUrl),
        changed: true,
        appended: false,
      };
    }
  }

  if (content.includes(trackedUrl)) {
    return { content, changed: false, appended: false };
  }

  if (append) {
    const appendedContent = `${content.trim()}\n\n${trackedUrl}`;
    return { content: appendedContent, changed: true, appended: true };
  }

  return { content, changed: false, appended: false };
}

export function buildPublishingAttribution({
  asset,
  context,
  params,
  channel,
}: {
  asset: Record<string, unknown>;
  context: PublishingAttributionContext;
  params: Record<string, unknown>;
  channel: string;
}): PublishingAttribution {
  const settings = mergeUtmTaxonomySettings(context.settings, stringValue(asset.account_id));
  const destinationUrl = resolveDestinationUrl({ asset, context: { ...context, settings }, params });
  const assetType = stringValue(asset.asset_type).toLowerCase();
  const sourceMedium = resolvedSourceMedium({ asset, settings, channel });
  const vipAsset = isUuid(asset.id) ? stringValue(asset.id) : "";
  const vipCampaign = isUuid(asset.campaign_id) ? stringValue(asset.campaign_id) : null;

  const base = {
    channel: normalizeUtmToken(channel, "manual", 60),
    destinationUrl,
    utmSource: sourceMedium.source,
    utmMedium: sourceMedium.medium,
    utmCampaign: campaignSlug(asset, { ...context, settings }),
    utmContent: contentSlug(asset),
    utmTerm: audienceTerm(asset, { ...context, settings }),
    vipCampaign,
    vipAsset,
    taxonomyVersion: settings.taxonomy_version || VIP_UTM_TAXONOMY_VERSION,
  };

  if (!vipAsset) {
    return {
      ...base,
      ready: false,
      reason: "The asset does not have a valid Marketing VIP UUID.",
      trackedUrl: null,
      appendedToContent: false,
    };
  }

  if (!destinationUrl) {
    return {
      ...base,
      ready: false,
      reason: "No valid HTTP or HTTPS campaign destination URL was found.",
      trackedUrl: null,
      appendedToContent: false,
    };
  }

  const includeStandardUtm = assetType !== "blog_post";
  const trackedUrl = addTrackingParameters({
    destinationUrl,
    attribution: base,
    includeStandardUtm,
  });

  return {
    ...base,
    ready: true,
    reason: null,
    trackedUrl,
    appendedToContent: false,
  };
}

export function applyPublishingAttributionToParams({
  asset,
  context,
  params,
  channel,
}: {
  asset: Record<string, unknown>;
  context: PublishingAttributionContext;
  params: Record<string, unknown>;
  channel: string;
}) {
  const settings = mergeUtmTaxonomySettings(context.settings, stringValue(asset.account_id));
  const attribution = buildPublishingAttribution({
    asset,
    context: { ...context, settings },
    params,
    channel,
  });

  if (!attribution.ready || !attribution.destinationUrl || !attribution.trackedUrl) {
    return {
      params: {
        ...params,
        analytics_attribution: attribution,
      },
      attribution,
    };
  }

  const assetType = stringValue(asset.asset_type).toLowerCase();
  const append = shouldAppendLink(assetType, settings);
  let appendedToContent = false;
  const attributedParams: Record<string, unknown> = { ...params };

  for (const key of CONTENT_PARAM_KEYS) {
    if (typeof attributedParams[key] !== "string") continue;
    const result = trackedContent({
      content: String(attributedParams[key]),
      destinationUrl: attribution.destinationUrl,
      trackedUrl: attribution.trackedUrl,
      append,
    });
    attributedParams[key] = result.content;
    appendedToContent = appendedToContent || result.appended;
  }

  const finalAttribution = { ...attribution, appendedToContent };

  Object.assign(attributedParams, {
    destination_url: attribution.destinationUrl,
    tracked_url: attribution.trackedUrl,
    link: attribution.trackedUrl,
    link_url: attribution.trackedUrl,
    cta_url: attribution.trackedUrl,
    landing_page_url: attribution.trackedUrl,
    utm_source: attribution.utmSource,
    utm_medium: attribution.utmMedium,
    utm_campaign: attribution.utmCampaign,
    utm_content: attribution.utmContent,
    utm_term: attribution.utmTerm,
    vip_campaign: attribution.vipCampaign,
    vip_asset: attribution.vipAsset,
    analytics_attribution: finalAttribution,
  });

  return { params: attributedParams, attribution: finalAttribution };
}
