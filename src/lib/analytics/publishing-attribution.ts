import {
  applyPublishingAttributionToParams,
  defaultUtmTaxonomySettings,
  mergeUtmTaxonomySettings,
  type PublishingAttribution,
  type PublishingAttributionContext,
  type UtmTaxonomySettings,
} from "@/lib/analytics/utm-taxonomy";

type SupabaseLike = {
  from: (table: string) => any;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function recordValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function resolvedAccountId(asset: Record<string, unknown>, campaign: Record<string, unknown> | null) {
  const resolution = recordValue(asset.account_publishing_settings_resolution);
  return (
    stringValue(asset.account_id) ||
    stringValue(campaign?.account_id) ||
    stringValue(resolution.accountId) ||
    null
  );
}

export async function loadPublishingAttributionContext({
  supabase,
  asset,
}: {
  supabase: SupabaseLike;
  asset: Record<string, unknown>;
}): Promise<PublishingAttributionContext & { accountId: string | null }> {
  const campaignId = stringValue(asset.campaign_id);
  let campaign: Record<string, unknown> | null = null;

  if (campaignId) {
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();
    campaign = (data ?? null) as Record<string, unknown> | null;
  }

  const accountId = resolvedAccountId(asset, campaign);
  let account: Record<string, unknown> | null = null;
  let storedSettings: UtmTaxonomySettings | null = null;

  if (accountId) {
    const [{ data: accountData }, { data: settingsData }] = await Promise.all([
      supabase
        .from("accounts")
        .select("id,name,slug,website_url,primary_cta,status")
        .eq("id", accountId)
        .maybeSingle(),
      supabase
        .from("analytics_utm_settings")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle(),
    ]);

    account = (accountData ?? null) as Record<string, unknown> | null;
    storedSettings = (settingsData ?? null) as UtmTaxonomySettings | null;
  }

  return {
    accountId,
    account,
    campaign,
    settings: mergeUtmTaxonomySettings(
      storedSettings ?? defaultUtmTaxonomySettings(accountId),
      accountId,
    ),
  };
}

export async function prepareAttributedPublishingPayload({
  supabase,
  asset,
  params,
  channel,
}: {
  supabase: SupabaseLike;
  asset: Record<string, unknown>;
  params: Record<string, unknown>;
  channel: string;
}) {
  const context = await loadPublishingAttributionContext({ supabase, asset });
  const enrichedAsset: Record<string, unknown> = {
    ...asset,
    account_id: stringValue(asset.account_id) || context.accountId,
    analytics_attribution_context: context,
  };
  const result = applyPublishingAttributionToParams({
    asset: enrichedAsset,
    context,
    params,
    channel,
  });

  return {
    ...result,
    asset: enrichedAsset,
    context,
  };
}

export async function persistPublishingAttribution({
  supabase,
  userId,
  asset,
  attribution,
  accountId,
}: {
  supabase: SupabaseLike;
  userId: string;
  asset: Record<string, unknown>;
  attribution: PublishingAttribution;
  accountId: string | null;
}) {
  if (
    !accountId ||
    !attribution.ready ||
    !attribution.destinationUrl ||
    !attribution.trackedUrl ||
    !attribution.vipAsset
  ) {
    return null;
  }

  const campaignId = stringValue(asset.campaign_id) || null;
  const assetId = stringValue(asset.id);

  const slugUpdates: PromiseLike<unknown>[] = [
    supabase
      .from("generated_assets")
      .update({ analytics_content_slug: attribution.utmContent })
      .eq("id", assetId)
      .is("analytics_content_slug", null),
  ];

  if (campaignId) {
    slugUpdates.push(
      supabase
        .from("campaigns")
        .update({ analytics_campaign_slug: attribution.utmCampaign })
        .eq("id", campaignId)
        .is("analytics_campaign_slug", null),
    );
  }

  const slugResults = (await Promise.all(slugUpdates)) as Array<{ error?: { message?: string } | null }>;
  const slugError = slugResults.find((result) => result?.error)?.error;
  if (slugError) {
    throw new Error(
      `Unable to persist the Marketing VIP attribution slug: ${slugError.message ?? "Unknown database error."}`,
    );
  }

  const { data, error } = await supabase
    .from("analytics_tracking_links")
    .upsert(
      {
        account_id: accountId,
        campaign_id: campaignId,
        asset_id: assetId,
        channel: attribution.channel,
        destination_url: attribution.destinationUrl,
        tracked_url: attribution.trackedUrl,
        utm_source: attribution.utmSource,
        utm_medium: attribution.utmMedium,
        utm_campaign: attribution.utmCampaign,
        utm_content: attribution.utmContent,
        utm_term: attribution.utmTerm,
        vip_campaign: attribution.vipCampaign,
        vip_asset: attribution.vipAsset,
        taxonomy_version: attribution.taxonomyVersion,
        is_current: true,
        created_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "asset_id,channel" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to save the Marketing VIP tracking link: ${error.message}`);
  }

  return data as Record<string, unknown>;
}

export async function attachAttributionToPublishingRun({
  supabase,
  runId,
  userId,
  asset,
  attribution,
  trackingLink,
}: {
  supabase: SupabaseLike;
  runId: string | null | undefined;
  userId: string;
  asset: Record<string, unknown>;
  attribution: PublishingAttribution;
  trackingLink: Record<string, unknown> | null;
}) {
  if (!runId) return null;

  const { data, error } = await supabase
    .from("publishing_execution_runs")
    .update({
      campaign_id: stringValue(asset.campaign_id) || null,
      tracking_link_id: stringValue(trackingLink?.id) || null,
      destination_url: attribution.destinationUrl,
      tracked_url: attribution.trackedUrl,
      attribution,
    })
    .eq("id", runId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to attach attribution to the publishing run: ${error.message}`);
  }

  return data ?? null;
}
