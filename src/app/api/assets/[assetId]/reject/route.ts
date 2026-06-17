import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { assetId } = await context.params;
    const supabase = untypedSupabase(await createClient());
    const body = await request.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes : null;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assetAccess = await getAssetAccessForUser({ supabase, assetId, userId: user.id });

    if (!assetAccess.asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    if (!assetAccess.canManage) {
      return NextResponse.json({ error: "You do not have permission to reject this asset." }, { status: 403 });
    }

    const asset = assetAccess.asset;

    const { error: updateError } = await scopeAssetQueryForAccess({
      query: supabase.from("generated_assets").update({ status: "rejected" }),
      asset,
      accountId: assetAccess.accountId,
      userId: user.id,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const { error: approvalError } = await supabase.from("approvals").insert({
      user_id: user.id,
      asset_id: assetId,
      status: "rejected",
      notes,
    });

    if (approvalError) {
      return NextResponse.json({ error: approvalError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "asset_rejected",
      title: "Asset rejected",
      description: asset.title ?? asset.asset_type,
      metadata: {
        assetId,
        accountId: assetAccess.accountId,
        campaignId: asset.campaign_id,
        assetType: asset.asset_type,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected error rejecting asset." }, { status: 500 });
  }
}
