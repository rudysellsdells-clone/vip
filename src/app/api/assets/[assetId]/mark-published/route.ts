import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: asset, error } = await supabase
    .from("generated_assets")
    .update({
      scheduling_status: "published",
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
    activity_type: "asset_marked_published",
    title: "Asset marked published",
    description: asset.title ?? assetId,
    metadata: {
      assetId,
      assetType: asset.asset_type,
      scheduled_publish_at: asset.scheduled_publish_at ?? null,
      publish_timezone: asset.publish_timezone ?? null,
      manualPublish: true,
    },
  });

  return NextResponse.json({
    ok: true,
    asset,
  });
}
