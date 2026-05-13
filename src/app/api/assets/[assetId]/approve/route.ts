import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/security/auditLog";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { assetId } = await context.params;
    const supabase = await createClient();
    const db = supabase as any;
    const body = await request.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes : null;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: asset, error: assetError } = await db
      .from("generated_assets")
      .select("*")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const { error: updateError } = await db
      .from("generated_assets")
      .update({ status: "approved" })
      .eq("id", assetId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const { error: approvalError } = await db.from("approvals").insert({
      user_id: user.id,
      asset_id: assetId,
      status: "approved",
      notes,
      approved_at: new Date().toISOString(),
    });

    if (approvalError) {
      return NextResponse.json({ error: approvalError.message }, { status: 400 });
    }

    await logActivity(db, {
      userId: user.id,
      activityType: "asset_approved",
      title: "Asset approved",
      description: asset.title ?? asset.asset_type,
      metadata: {
        assetId,
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
