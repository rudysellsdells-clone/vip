import { NextResponse } from "next/server";
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

  const reason = archiveReasonText(await readReason(request), "Archived by user");

  const { data: asset, error } = await supabase
    .from("generated_assets")
    .update({ archived_at: archiveTimestamp(), archived_reason: reason, archived_by: user.id })
    .eq("id", assetId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !asset) return NextResponse.json({ error: error?.message ?? "Asset not found." }, { status: 404 });

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "asset_archived",
    title: "Asset archived",
    description: asset.title ?? assetId,
    metadata: { assetId, assetType: asset.asset_type, reason },
  });

  return NextResponse.json({ ok: true, asset });
}
