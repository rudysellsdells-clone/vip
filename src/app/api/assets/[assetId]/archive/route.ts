import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { archiveReasonText, archiveTimestamp } from "@/lib/archive/archive-utils";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = { params: Promise<{ assetId: string }> };

async function readReason(request: Request) {
  try {
    const formData = await request.formData();
    return String(formData.get("reason") || "").trim();
  } catch {
    return "";
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assetAccess = await getAssetAccessForUser({ supabase, assetId, userId: user.id });

  if (!assetAccess.asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  if (!assetAccess.canManage) return NextResponse.json({ error: "You do not have permission to archive this asset." }, { status: 403 });

  const reason = archiveReasonText(await readReason(request), "Archived by user");

  const { data: asset, error } = await scopeAssetQueryForAccess({
    query: supabase
      .from("generated_assets")
      .update({ archived_at: archiveTimestamp(), archived_reason: reason, archived_by: user.id }),
    asset: assetAccess.asset,
    accountId: assetAccess.accountId,
    userId: user.id,
  }).select("*").single();

  if (error || !asset) return NextResponse.json({ error: error?.message ?? "Asset not found." }, { status: 404 });

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: assetAccess.accountId,
    activity_type: "asset_archived",
    title: "Asset archived",
    description: asset.title ?? assetId,
    metadata: { assetId, accountId: assetAccess.accountId, assetType: asset.asset_type, reason },
  });

  return NextResponse.json({ ok: true, asset });
}
