export type AccountPublishingSettings = {
  id?: string | null;
  account_id?: string | null;
  linkedin_page_name?: string | null;
  linkedin_company_id?: string | null;
  facebook_page_name?: string | null;
  facebook_page_id?: string | null;
  primary_booking_url?: string | null;
  galaxyai_style?: string | null;
  default_hashtags?: string | null;
  settings?: Record<string, unknown> | null;
};

type SupabaseLike = {
  from: (table: string) => any;
};

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function publishingSettingsFromAsset(asset: Record<string, unknown>): AccountPublishingSettings | null {
  const settings = asset.account_publishing_settings;

  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return null;
  }

  return settings as AccountPublishingSettings;
}

export async function loadAccountPublishingSettings({
  supabase,
  accountId,
}: {
  supabase: SupabaseLike;
  accountId: string | null | undefined;
}): Promise<AccountPublishingSettings | null> {
  const safeAccountId = textOrNull(accountId);

  if (!safeAccountId) {
    return null;
  }

  const { data, error } = await supabase
    .from("account_publishing_settings")
    .select(
      "id,account_id,linkedin_page_name,linkedin_company_id,facebook_page_name,facebook_page_id,primary_booking_url,galaxyai_style,default_hashtags,settings",
    )
    .eq("account_id", safeAccountId)
    .maybeSingle();

  if (error) {
    // Do not hide the asset if publishing settings are temporarily unavailable.
    // Routes that require a setting should validate the enriched asset before execution.
    return null;
  }

  return (data ?? null) as AccountPublishingSettings | null;
}

export async function attachAccountPublishingSettingsToAsset<T extends Record<string, unknown>>({
  supabase,
  asset,
}: {
  supabase: SupabaseLike;
  asset: T;
}): Promise<T & { account_publishing_settings: AccountPublishingSettings | null }> {
  const settings = await loadAccountPublishingSettings({
    supabase,
    accountId: textOrNull(asset.account_id),
  });

  return {
    ...asset,
    account_publishing_settings: settings,
  };
}

export function isLikelyLinkedInOrganizationId(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text) return false;

  return /^\d+$/.test(text) || /^urn:li:organization:\d+$/.test(text);
}

export function normalizeLinkedInOrganizationId(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text) return "";

  return text;
}
