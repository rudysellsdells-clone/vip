export async function loadLatestQualityReview({
  supabase,
  userId,
  assetId,
}: {
  supabase: any;
  userId: string;
  assetId: string;
}) {
  const { data, error } = await supabase
    .from("asset_quality_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      review: null,
      error: error.message,
    };
  }

  return {
    review: data ?? null,
    error: null,
  };
}

export async function loadLatestQualityReviewsForAssets({
  supabase,
  userId,
  assetIds,
}: {
  supabase: any;
  userId: string;
  assetIds: string[];
}) {
  if (!assetIds.length) {
    return {
      reviewsByAssetId: new Map<string, Record<string, any>>(),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("asset_quality_reviews")
    .select("*")
    .eq("user_id", userId)
    .in("asset_id", assetIds)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      reviewsByAssetId: new Map<string, Record<string, any>>(),
      error: error.message,
    };
  }

  const reviewsByAssetId = new Map<string, Record<string, any>>();

  for (const review of (data ?? []) as Array<Record<string, any>>) {
    if (!reviewsByAssetId.has(review.asset_id)) {
      reviewsByAssetId.set(review.asset_id, review);
    }
  }

  return {
    reviewsByAssetId,
    error: null,
  };
}
