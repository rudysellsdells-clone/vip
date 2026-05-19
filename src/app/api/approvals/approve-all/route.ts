import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

const REVIEWABLE_STATUSES = ["needs_review", "revision_requested"];

export async function POST() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: assets, error: loadError } = await supabase
    .from("generated_assets")
    .select("id,title,status,asset_type,campaign_id")
    .eq("user_id", user.id)
    .in("status", REVIEWABLE_STATUSES);

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 400 });
  }

  const assetRows = (assets ?? []) as Array<Record<string, any>>;

  if (assetRows.length === 0) {
    return NextResponse.json({
      ok: true,
      approvedCount: 0,
      message: "No assets are waiting for approval.",
    });
  }

  const assetIds = assetRows.map((asset) => asset.id);

  const { error: updateError } = await supabase
    .from("generated_assets")
    .update({
      status: "approved",
    })
    .eq("user_id", user.id)
    .in("id", assetIds);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const approvalRows = assetRows.map((asset) => ({
    user_id: user.id,
    asset_id: asset.id,
    status: "approved",
    notes: "Bulk approved from the Approval Queue.",
  }));

  const { error: approvalError } = await supabase
    .from("approvals")
    .insert(approvalRows);

  if (approvalError) {
    // The asset status update already succeeded. Return a warning instead of
    // failing the entire action, because approval records are audit support.
    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "bulk_approval_completed_with_warning",
      title: "Bulk approval completed with warning",
      description: approvalError.message,
      metadata: {
        approvedCount: assetRows.length,
        assetIds,
      },
    });

    return NextResponse.json({
      ok: true,
      approvedCount: assetRows.length,
      warning: approvalError.message,
    });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "bulk_assets_approved",
    title: "Assets bulk approved",
    description: `Approved ${assetRows.length} asset${assetRows.length === 1 ? "" : "s"} from the approval queue.`,
    metadata: {
      approvedCount: assetRows.length,
      assetIds,
      assetTypes: assetRows.map((asset) => asset.asset_type),
      campaignIds: Array.from(new Set(assetRows.map((asset) => asset.campaign_id).filter(Boolean))),
    },
  });

  return NextResponse.json({
    ok: true,
    approvedCount: assetRows.length,
    assetIds,
  });
}
