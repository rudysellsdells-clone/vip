import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

const ALLOWED_STATUSES = new Set(["approved", "needs_review"]);

export async function POST(request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "").trim();

  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "Invalid status. Use approved or needs_review." },
      { status: 400 }
    );
  }

  const assetAccess = await getAssetAccessForUser({ supabase, assetId, userId: user.id });

  if (!assetAccess.asset) {
    return NextResponse.json({ error: "Asset not found or has been archived." }, { status: 404 });
  }

  if (!assetAccess.canManage) {
    return NextResponse.json(
      { error: "You do not have permission to update this asset." },
      { status: 403 }
    );
  }

  const accountContext = assetAccess.accountId
    ? null
    : await getUserAccountContext({ supabase, userId: user.id });
  const resolvedAccountId = assetAccess.accountId ?? accountContext?.activeAccountId ?? null;
  const updateValues: Record<string, any> = { status };

  if (status === "approved" && !assetAccess.accountId && resolvedAccountId) {
    updateValues.account_id = resolvedAccountId;
  }

  const { data: asset, error } = await scopeAssetQueryForAccess({
    query: supabase
      .from("generated_assets")
      .update(updateValues)
      .is("archived_at", null),
    asset: assetAccess.asset,
    accountId: assetAccess.accountId,
    userId: user.id,
  }).select("*").single();

  if (error || !asset) {
    return NextResponse.json(
      { error: error?.message ?? "Asset not found or has been archived." },
      { status: 404 }
    );
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: resolvedAccountId,
    activity_type: "asset_approval_status_updated",
    title: "Asset approval status updated",
    description: asset.title ?? assetId,
    metadata: {
      assetId,
      accountId: resolvedAccountId,
      assetType: asset.asset_type,
      status,
    },
  });

  return NextResponse.json({
    ok: true,
    asset,
  });
}
