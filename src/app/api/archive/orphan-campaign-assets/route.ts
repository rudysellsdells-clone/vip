import { NextResponse } from "next/server";
import { CAMPAIGN_ASSET_TYPES, archiveTimestamp } from "@/lib/archive/archive-utils";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export async function POST() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const archivedAt = archiveTimestamp();

  const { data: archivedAssets, error } = await supabase
    .from("generated_assets")
    .update({
      archived_at: archivedAt,
      archived_reason: "Bulk archived orphan campaign asset",
      archived_by: user.id,
    })
    .eq("user_id", user.id)
    .is("campaign_id", null)
    .is("archived_at", null)
    .in("asset_type", CAMPAIGN_ASSET_TYPES)
    .select("id,title,asset_type,status");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "orphan_campaign_assets_bulk_archived",
    title: "Orphan campaign assets bulk archived",
    description: `${archivedAssets?.length ?? 0} orphan campaign assets archived.`,
    metadata: {
      archivedAt,
      archivedAssetCount: archivedAssets?.length ?? 0,
      archivedAssetIds: (archivedAssets ?? []).map((asset: Record<string, any>) => asset.id),
    },
  });

  return NextResponse.json({
    ok: true,
    archivedAssets: archivedAssets ?? [],
    archivedAssetCount: archivedAssets?.length ?? 0,
  });
}
