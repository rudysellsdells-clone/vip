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

export type AccountPublishingSettingsResolution = {
  source: string;
  accountId: string | null;
  candidateAccountIds: string[];
  found: boolean;
};

type SupabaseLike = {
  from: (table: string) => any;
};

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uniqueTexts(values: Array<unknown>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = textOrNull(value);

    if (text && !seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
  }

  return result;
}

export function publishingSettingsFromAsset(asset: Record<string, unknown>): AccountPublishingSettings | null {
  const settings = asset.account_publishing_settings;

  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return null;
  }

  return settings as AccountPublishingSettings;
}

export function publishingSettingsResolutionFromAsset(asset: Record<string, unknown>): AccountPublishingSettingsResolution | null {
  const resolution = asset.account_publishing_settings_resolution;

  if (!resolution || typeof resolution !== "object" || Array.isArray(resolution)) {
    return null;
  }

  return resolution as AccountPublishingSettingsResolution;
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

async function accountIdFromCampaign({
  supabase,
  campaignId,
  userId,
}: {
  supabase: SupabaseLike;
  campaignId: string | null;
  userId: string | null;
}) {
  if (!campaignId) return null;

  let query = supabase
    .from("campaigns")
    .select("account_id,user_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data } = await query;
  const row = (data ?? null) as Record<string, unknown> | null;

  return textOrNull(row?.account_id);
}

async function preferredProfileAccountIds({
  supabase,
  userId,
}: {
  supabase: SupabaseLike;
  userId: string | null;
}) {
  if (!userId) return [];

  const { data } = await supabase
    .from("profiles")
    .select("last_active_account_id,default_account_id")
    .eq("id", userId)
    .maybeSingle();

  const row = (data ?? null) as Record<string, unknown> | null;

  return uniqueTexts([row?.last_active_account_id, row?.default_account_id]);
}

async function accessibleAccountIdsForUser({
  supabase,
  userId,
}: {
  supabase: SupabaseLike;
  userId: string | null;
}) {
  if (!userId) return [];

  const [{ data: ownedAccounts }, { data: memberships }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,status,owner_user_id,created_at")
      .eq("owner_user_id", userId)
      .neq("status", "archived")
      .order("created_at", { ascending: true }),
    supabase
      .from("account_memberships")
      .select("account_id,status,removed_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .is("removed_at", null),
  ]);

  const ownedIds = ((ownedAccounts ?? []) as Record<string, unknown>[]).map((row) => row.id);
  const membershipIds = ((memberships ?? []) as Record<string, unknown>[]).map((row) => row.account_id);

  return uniqueTexts([...ownedIds, ...membershipIds]);
}

async function accountPublishingSettingCandidates({
  supabase,
  asset,
}: {
  supabase: SupabaseLike;
  asset: Record<string, unknown>;
}) {
  const userId = textOrNull(asset.user_id);
  const campaignId = textOrNull(asset.campaign_id);
  const directAccountId = textOrNull(asset.account_id);

  const [campaignAccountId, profileAccountIds, accessibleAccountIds] = await Promise.all([
    accountIdFromCampaign({ supabase, campaignId, userId }),
    preferredProfileAccountIds({ supabase, userId }),
    accessibleAccountIdsForUser({ supabase, userId }),
  ]);

  return uniqueTexts([
    directAccountId,
    campaignAccountId,
    ...profileAccountIds,
    ...accessibleAccountIds,
  ]);
}

export async function resolveAccountPublishingSettingsForAsset({
  supabase,
  asset,
}: {
  supabase: SupabaseLike;
  asset: Record<string, unknown>;
}): Promise<{
  settings: AccountPublishingSettings | null;
  resolution: AccountPublishingSettingsResolution;
}> {
  const candidateAccountIds = await accountPublishingSettingCandidates({ supabase, asset });

  for (const accountId of candidateAccountIds) {
    const settings = await loadAccountPublishingSettings({ supabase, accountId });

    if (settings) {
      return {
        settings,
        resolution: {
          source: textOrNull(asset.account_id) === accountId
            ? "asset.account_id"
            : textOrNull(asset.campaign_id)
              ? "resolved_account_candidate"
              : "profile_or_accessible_account_fallback",
          accountId,
          candidateAccountIds,
          found: true,
        },
      };
    }
  }

  return {
    settings: null,
    resolution: {
      source: "not_found",
      accountId: null,
      candidateAccountIds,
      found: false,
    },
  };
}

export async function attachAccountPublishingSettingsToAsset<T extends Record<string, unknown>>({
  supabase,
  asset,
}: {
  supabase: SupabaseLike;
  asset: T;
}): Promise<T & {
  account_publishing_settings: AccountPublishingSettings | null;
  account_publishing_settings_resolution: AccountPublishingSettingsResolution;
}> {
  const { settings, resolution } = await resolveAccountPublishingSettingsForAsset({
    supabase,
    asset,
  });

  return {
    ...asset,
    account_publishing_settings: settings,
    account_publishing_settings_resolution: resolution,
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
