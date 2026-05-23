import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const supabase = untypedSupabase(await createClient());
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .update({ archived_at: null, archived_reason: null, archived_by: null })
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (campaignError || !campaign) return NextResponse.json({ error: campaignError?.message ?? "Campaign not found." }, { status: 404 });

  const { data: restoredAssets, error: assetError } = await supabase
    .from("generated_assets")
    .update({ archived_at: null, archived_reason: null, archived_by: null })
    .eq("user_id", user.id)
    .eq("campaign_id", campaignId)
    .not("archived_at", "is", null)
    .select("id,title,asset_type,status");

  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 400 });

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "campaign_restored",
    title: "Campaign restored",
    description: campaign.name ?? campaign.title ?? campaignId,
    metadata: { campaignId, restoredAssetCount: restoredAssets?.length ?? 0 },
  });

  return NextResponse.json({ ok: true, campaign, restoredAssets: restoredAssets ?? [] });
}
