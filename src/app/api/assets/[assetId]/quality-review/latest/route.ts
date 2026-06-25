import { NextResponse } from "next/server";
import { getAssetAccessForUser } from "@/lib/accounts/asset-access";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assetAccess = await getAssetAccessForUser({ supabase, assetId, userId: user.id });

  if (!assetAccess.asset || assetAccess.asset.archived_at) {
    return NextResponse.json(
      { error: "Asset not found or has been archived." },
      { status: 404 }
    );
  }

  if (!assetAccess.canView) {
    return NextResponse.json({ error: "You do not have permission to view this asset." }, { status: 403 });
  }

  const asset = assetAccess.asset;

  const { data: review, error: reviewError } = await supabase
    .from("asset_quality_reviews")
    .select("*")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    asset,
    review: review ?? null,
  });
}