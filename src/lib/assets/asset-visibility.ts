export type AssetRecord = Record<string, any>;

export function isLatestVisibleAsset(asset: AssetRecord) {
  if (!asset) return false;
  if (asset.archived_at) return false;
  if (asset.is_active_version === false) return false;
  if (asset.superseded_by_asset_id) return false;
  return true;
}

export function isWorkingAsset(asset: AssetRecord) {
  if (!isLatestVisibleAsset(asset)) return false;

  const status = String(asset.status ?? "");
  const schedulingStatus = String(asset.scheduling_status ?? "");

  if (status === "published") return false;
  if (schedulingStatus === "published") return false;
  if (asset.published_at) return false;

  return true;
}

export function isPublishingScheduleAsset(asset: AssetRecord) {
  return isWorkingAsset(asset) && String(asset.status ?? "") === "approved";
}

export function isPublishedAsset(asset: AssetRecord) {
  return (
    String(asset.status ?? "") === "published" ||
    String(asset.scheduling_status ?? "") === "published" ||
    Boolean(asset.published_at)
  );
}

export function filterLatestVisibleAssets<T extends AssetRecord>(assets: T[]) {
  return assets.filter(isLatestVisibleAsset);
}

export function filterWorkingAssets<T extends AssetRecord>(assets: T[]) {
  return assets.filter(isWorkingAsset);
}

export function filterPublishingScheduleAssets<T extends AssetRecord>(assets: T[]) {
  return assets.filter(isPublishingScheduleAsset);
}

export function filterPublishedAssets<T extends AssetRecord>(assets: T[]) {
  return assets.filter(isPublishedAsset);
}

export function applyLatestVisibleAssetQuery(query: any) {
  return query
    .is("archived_at", null)
    .eq("is_active_version", true)
    .is("superseded_by_asset_id", null);
}

export function applyWorkingAssetQuery(query: any) {
  return applyLatestVisibleAssetQuery(query)
    .neq("status", "published")
    .neq("scheduling_status", "published")
    .is("published_at", null);
}

export function applyPublishingScheduleQuery(query: any) {
  return applyWorkingAssetQuery(query)
    .eq("status", "approved");
}
