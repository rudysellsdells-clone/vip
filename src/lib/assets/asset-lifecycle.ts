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

export async function supersedeAssetVersion({
  supabase,
  userId,
  originalAssetId,
  newAssetId,
  reason = "superseded_by_newer_version",
}: {
  supabase: any;
  userId: string;
  originalAssetId: string;
  newAssetId: string;
  reason?: string;
}) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("generated_assets")
    .update({
      is_active_version: false,
      superseded_by_asset_id: newAssetId,
      replaced_at: now,
      archived_at: now,
      archive_reason: reason,
    })
    .eq("id", originalAssetId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function prepareNewAssetVersion({
  supabase,
  userId,
  newAssetId,
  parentAssetId,
}: {
  supabase: any;
  userId: string;
  newAssetId: string;
  parentAssetId: string;
}) {
  await activateAssetVersion({
    supabase,
    userId,
    assetId: newAssetId,
    rootId: parentAssetId,
  });
}

export async function activateNewAssetVersion({
  supabase,
  userId,
  newAssetId,
  parentAssetId,
}: {
  supabase: any;
  userId: string;
  newAssetId: string;
  parentAssetId: string;
}) {
  await activateAssetVersion({
    supabase,
    userId,
    assetId: newAssetId,
    rootId: parentAssetId,
  });
}

export async function markAssetPublished({
  supabase,
  userId,
  assetId,
  provider = "zapier",
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
      published_via: "zapier",
      published_reference: reference,
    })
    .eq("id", assetId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (!preferredUpdate.error && preferredUpdate.data) {
    return preferredUpdate.data;
  }

  /*
    Fallback for schemas/check constraints that do not allow sent_to_zapier.
    This keeps the workflow moving by removing the asset from working/publishing queues.
  */
  return markAssetPublished({
    supabase,
    userId,
    assetId,
    provider: "zapier",
    reference,
  });
}

export async function archiveWorkingAsset({
  supabase,
  userId,
  assetId,
  reason = "manual_archive",
}: {
  supabase: any;
  userId: string;
  assetId: string;
  reason?: string;
}) {
  const { error } = await supabase
    .from("generated_assets")
    .update({
      archived_at: new Date().toISOString(),
      archive_reason: reason,
      is_active_version: false,
    })
    .eq("id", assetId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
