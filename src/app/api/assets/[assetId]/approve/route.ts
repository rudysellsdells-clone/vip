import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";

const APPROVER_ROLES_MESSAGE = "You do not have permission to approve this asset.";

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
      return NextResponse.json({ error: APPROVER_ROLES_MESSAGE }, { status: 403 });
    }

    const asset = assetAccess.asset;
    const accountContext = assetAccess.accountId
      ? null
      : await getUserAccountContext({ supabase, userId: user.id });
    const resolvedAccountId = assetAccess.accountId ?? accountContext?.activeAccountId ?? null;
    const updateValues: Record<string, any> = { status: "approved" };

    if (!assetAccess.accountId && resolvedAccountId) {
      updateValues.account_id = resolvedAccountId;
    }

    const { error: updateError } = await scopeAssetQueryForAccess({
      query: supabase.from("generated_assets").update(updateValues),
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
      status: "approved",
      notes,
      approved_at: new Date().toISOString(),
    });

    if (approvalError) {
      return NextResponse.json({ error: approvalError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "asset_approved",
      title: "Asset approved",
      description: asset.title ?? asset.asset_type,
      metadata: {
        assetId,
        accountId: resolvedAccountId,
        campaignId: asset.campaign_id,
        assetType: asset.asset_type,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected error approving asset." }, { status: 500 });
  }
}
