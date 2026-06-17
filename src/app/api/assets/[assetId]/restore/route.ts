import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = { params: Promise<{ assetId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assetAccess = await getAssetAccessForUser({ supabase, assetId, userId: user.id });

  if (!assetAccess.asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  if (!assetAccess.canManage) return NextResponse.json({ error: "You do not have permission to restore this asset." }, { status: 403 });

  const { data: asset, error } = await scopeAssetQueryForAccess({
    query: supabase
      .from("generated_assets")
      .update({ archived_at: null, archived_reason: null, archived_by: null }),
    asset: assetAccess.asset,
    accountId: assetAccess.accountId,
    userId: user.id,
  }).select("*").single();

  if (error || !asset) return NextResponse.json({ error: error?.message ?? "Asset not found." }, { status: 404 });

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: assetAccess.accountId,
    activity_type: "asset_restored",
    title: "Asset restored",
    description: asset.title ?? assetId,
    metadata: { assetId, accountId: assetAccess.accountId, assetType: asset.asset_type },
  });

  return NextResponse.json({ ok: true, asset });
}
