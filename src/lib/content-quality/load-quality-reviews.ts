import { latestReviewByAssetId } from "@/lib/content-quality/review-display";

export async function loadLatestQualityReviewsByAssetId({
  supabase,
  userId,
  assetIds,
}: {
  supabase: any;
  userId: string;
  assetIds: string[];
}) {
  const ids = Array.from(new Set(assetIds.filter(Boolean)));

  if (!ids.length) {
    return new Map<string, Record<string, any>>();
  }

  const { data, error } = await supabase
    .from("asset_quality_reviews")
    .select("*")
    .in("asset_id", ids)
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    return new Map<string, Record<string, any>>();
  }

  return latestReviewByAssetId(data as Array<Record<string, any>>);
}