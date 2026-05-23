import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = { params: Promise<{ assetId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: asset, error } = await supabase
    .from("generated_assets")
    .update({ archived_at: null, archived_reason: null, archived_by: null })
    .eq("id", assetId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !asset) return NextResponse.json({ error: error?.message ?? "Asset not found." }, { status: 404 });

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "asset_restored",
    title: "Asset restored",
    description: asset.title ?? assetId,
    metadata: { assetId, assetType: asset.asset_type },
  });

  return NextResponse.json({ ok: true, asset });
}
