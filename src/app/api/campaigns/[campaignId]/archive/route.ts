import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
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
    .maybeSingle();

  if (campaignError || !campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const accountId = campaign.account_id ? String(campaign.account_id) : null;

  if (accountId) {
    const access = await getAccountAccessForUser({ supabase, accountId, userId: user.id });
    if (!access.canManage) {
      return NextResponse.json({ error: "You do not have permission to archive this campaign." }, { status: 403 });
    }
  } else if (campaign.user_id !== user.id) {
    return NextResponse.json({ error: "You do not have permission to archive this campaign." }, { status: 403 });
  }

  const archivedAt = archiveTimestamp();
  const reason = archiveReasonText(await readReason(request), "Archived by user");

  let campaignUpdate = supabase
    .from("campaigns")
    .update({ archived_at: archivedAt, archived_reason: reason, archived_by: user.id })
    .eq("id", campaignId);

  campaignUpdate = accountId ? campaignUpdate.eq("account_id", accountId) : campaignUpdate.eq("user_id", user.id);

  const { data: updatedCampaign, error: updateCampaignError } = await campaignUpdate
    .select("*")
    .single();

  if (updateCampaignError) return NextResponse.json({ error: updateCampaignError.message }, { status: 400 });

  let assetsUpdate = supabase
    .from("generated_assets")
    .update({ archived_at: archivedAt, archived_reason: `Campaign archived: ${reason}`, archived_by: user.id })
    .eq("campaign_id", campaignId)
    .is("archived_at", null);

  assetsUpdate = accountId ? assetsUpdate.eq("account_id", accountId) : assetsUpdate.eq("user_id", user.id);

  const { data: archivedAssets, error: assetError } = await assetsUpdate.select("id,title,asset_type,status");

  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 400 });

  await supabase.from("activity_log").insert({
    account_id: accountId,
    user_id: user.id,
    activity_type: "campaign_archived",
    title: "Campaign archived",
    description: campaign.name ?? campaign.title ?? campaignId,
    metadata: { campaignId, accountId, reason, archivedAt, archivedAssetCount: archivedAssets?.length ?? 0 },
  });

  return NextResponse.json({ ok: true, campaign: updatedCampaign, archivedAssets: archivedAssets ?? [] });
}
