import { NextResponse } from "next/server";
import { archiveReasonText, archiveTimestamp } from "@/lib/archive/archive-utils";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = { params: Promise<{ campaignId: string }> };

async function readReason(request: Request) {
  try {
    const formData = await request.formData();
    return String(formData.get("reason") || "").trim();
  } catch {
    return "";
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const supabase = untypedSupabase(await createClient());
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (campaignError || !campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const archivedAt = archiveTimestamp();
  const reason = archiveReasonText(await readReason(request), "Archived by user");

  const { data: updatedCampaign, error: updateCampaignError } = await supabase
    .from("campaigns")
    .update({ archived_at: archivedAt, archived_reason: reason, archived_by: user.id })
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateCampaignError) return NextResponse.json({ error: updateCampaignError.message }, { status: 400 });

  const { data: archivedAssets, error: assetError } = await supabase
    .from("generated_assets")
    .update({ archived_at: archivedAt, archived_reason: `Campaign archived: ${reason}`, archived_by: user.id })
    .eq("user_id", user.id)
    .eq("campaign_id", campaignId)
    .is("archived_at", null)
    .select("id,title,asset_type,status");

  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 400 });

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "campaign_archived",
    title: "Campaign archived",
    description: campaign.name ?? campaign.title ?? campaignId,
    metadata: { campaignId, reason, archivedAt, archivedAssetCount: archivedAssets?.length ?? 0 },
  });

  return NextResponse.json({ ok: true, campaign: updatedCampaign, archivedAssets: archivedAssets ?? [] });
}
