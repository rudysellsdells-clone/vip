export function rootAssetId(asset: Record<string, any>) {
  return String(asset.parent_asset_id ?? asset.id);
}

function scopeAssetMutation({
  query,
  accountId,
  userId,
}: {
  query: any;
  accountId?: string | null;
  userId: string;
}) {
  return accountId ? query.eq("account_id", accountId) : query.eq("user_id", userId);
}

export async function archiveSiblingAssetVersions({
  supabase,
  userId,
  rootId,
  activeAssetId,
  reason = "superseded_by_newer_version",
  accountId = null,
}: {
  supabase: any;
  userId: string;
  rootId: string;
  activeAssetId: string;
  reason?: string;
  accountId?: string | null;
}) {
  const now = new Date().toISOString();

  const { error: childError } = await scopeAssetMutation({
    query: supabase
      .from("generated_assets")
      .update({
        is_active_version: false,
        superseded_by_asset_id: activeAssetId,
        replaced_at: now,
        archived_at: now,
        archive_reason: reason,
      })
      .eq("parent_asset_id", rootId)
      .neq("id", activeAssetId),
    accountId,
    userId,
  });

  if (childError) throw new Error(childError.message);

  const { error: rootError } = await scopeAssetMutation({
    query: supabase
      .from("generated_assets")
      .update({
        is_active_version: false,
        superseded_by_asset_id: activeAssetId,
        replaced_at: now,
        archived_at: now,
        archive_reason: reason,
      })
      .eq("id", rootId)
      .neq("id", activeAssetId),
    accountId,
    userId,
  });

  if (rootError) throw new Error(rootError.message);
}

export async function activateAssetVersion({
  supabase,
  userId,
  assetId,
  rootId,
  accountId = null,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  rootId: string;
  accountId?: string | null;
}) {
  const { error } = await scopeAssetMutation({
    query: supabase
      .from("generated_assets")
      .update({
        parent_asset_id: rootId === assetId ? null : rootId,
        is_active_version: true,
        superseded_by_asset_id: null,
        archived_at: null,
        archive_reason: null,
      })
      .eq("id", assetId),
    accountId,
    userId,
  });

  if (error) throw new Error(error.message);
}

export async function markAssetPublished({
  supabase,
  userId,
  assetId,
  provider = "zapier_mcp",
  reference = null,
  accountId = null,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  provider?: string;
  reference?: string | null;
  accountId?: string | null;
}) {
  const now = new Date().toISOString();

  const { data, error } = await scopeAssetMutation({
    query: supabase
      .from("generated_assets")
      .update({
        status: "published",
        scheduling_status: "published",
        published_at: now,
        published_via: provider,
        published_reference: reference,
      })
      .eq("id", assetId),
    accountId,
    userId,
  })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function markAssetSentToZapier({
  supabase,
  userId,
  assetId,
  reference = null,
  accountId = null,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  reference?: string | null;
  accountId?: string | null;
}) {
  const now = new Date().toISOString();

  const preferredUpdate = await scopeAssetMutation({
    query: supabase
      .from("generated_assets")
      .update({
        status: "sent_to_zapier",
        scheduling_status: "sent_to_zapier",
        published_at: now,
        published_via: "zapier_mcp",
        published_reference: reference,
      })
      .eq("id", assetId),
    accountId,
    userId,
  })
    .select("*")
    .single();

  if (!preferredUpdate.error && preferredUpdate.data) {
    return preferredUpdate.data;
  }

  return markAssetPublished({
    supabase,
    userId,
    assetId,
    provider: "zapier_mcp",
    reference,
    accountId,
  });
}