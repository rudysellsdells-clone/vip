export function rootAssetId(asset: Record<string, any>) {
  return String(asset.parent_asset_id ?? asset.id);
}

export async function archiveSiblingAssetVersions({
  supabase,
  userId,
  rootId,
  activeAssetId,
  reason = "superseded_by_newer_version",
}: {
  supabase: any;
  userId: string;
  rootId: string;
  activeAssetId: string;
  reason?: string;
}) {
  const now = new Date().toISOString();

  const { error: childError } = await supabase
    .from("generated_assets")
    .update({
      is_active_version: false,
      superseded_by_asset_id: activeAssetId,
      replaced_at: now,
      archived_at: now,
      archive_reason: reason,
    })
    .eq("user_id", userId)
    .eq("parent_asset_id", rootId)
    .neq("id", activeAssetId);

  if (childError) throw new Error(childError.message);

  const { error: rootError } = await supabase
    .from("generated_assets")
    .update({
      is_active_version: false,
      superseded_by_asset_id: activeAssetId,
      replaced_at: now,
      archived_at: now,
      archive_reason: reason,
    })
    .eq("user_id", userId)
    .eq("id", rootId)
    .neq("id", activeAssetId);

  if (rootError) throw new Error(rootError.message);
}

export async function activateAssetVersion({
  supabase,
  userId,
  assetId,
  rootId,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  rootId: string;
}) {
  const { error } = await supabase
    .from("generated_assets")
    .update({
      parent_asset_id: rootId === assetId ? null : rootId,
      is_active_version: true,
      superseded_by_asset_id: null,
      archived_at: null,
      archive_reason: null,
    })
    .eq("id", assetId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function markAssetPublished({
  supabase,
  userId,
  assetId,
  provider = "zapier_mcp",
  reference = null,
}: {
  supabase: any;
  userId: string;
  assetId: string;
  provider?: string;
  reference?: string | null;
}) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("generated_assets")
    .update({
      status: "published",
      scheduling_status: "published",
      published_at: now,
      published_via: provider,
      published_reference: reference,
    })
    .eq("id", assetId)
    .eq("user_id", userId)
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
}: {
  supabase: any;
  userId: string;
  assetId: string;
  reference?: string | null;
}) {
  const now = new Date().toISOString();

  const preferredUpdate = await supabase
    .from("generated_assets")
    .update({
      status: "sent_to_zapier",
      scheduling_status: "sent_to_zapier",
      published_at: now,
      published_via: "zapier_mcp",
      published_reference: reference,
    })
    .eq("id", assetId)
    .eq("user_id", userId)
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
  });
}
