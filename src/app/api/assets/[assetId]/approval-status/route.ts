import { NextResponse } from "next/server";
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

  const { data: asset, error } = await supabase
    .from("generated_assets")
    .update({
      status,
    })
    .eq("id", assetId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("*")
    .single();

  if (error || !asset) {
    return NextResponse.json(
      { error: error?.message ?? "Asset not found or has been archived." },
      { status: 404 }
    );
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "asset_approval_status_updated",
    title: "Asset approval status updated",
    description: asset.title ?? assetId,
    metadata: {
      assetId,
      assetType: asset.asset_type,
      status,
    },
  });

  return NextResponse.json({
    ok: true,
    asset,
  });
}
