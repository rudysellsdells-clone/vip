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

  if (error) {
    throw new Error(error.message);
  }
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

  if (error) {
    throw new Error(error.message);
  }

  return data;
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
  const { error } = await supabase
    .from("generated_assets")
    .update({
      parent_asset_id: parentAssetId,
      is_active_version: true,
      superseded_by_asset_id: null,
      archived_at: null,
      archive_reason: null,
    })
    .eq("id", newAssetId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
