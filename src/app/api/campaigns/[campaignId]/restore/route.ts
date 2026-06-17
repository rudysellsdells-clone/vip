import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = { params: Promise<{ campaignId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const supabase = untypedSupabase(await createClient());
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existingCampaign, error: existingCampaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (existingCampaignError || !existingCampaign) {
    return NextResponse.json({ error: existingCampaignError?.message ?? "Campaign not found." }, { status: 404 });
  }

  const accountId = existingCampaign.account_id ? String(existingCampaign.account_id) : null;

  if (accountId) {
    const access = await getAccountAccessForUser({ supabase, accountId, userId: user.id });
    if (!access.canManage) {
      return NextResponse.json({ error: "You do not have permission to restore this campaign." }, { status: 403 });
    }
  } else if (existingCampaign.user_id !== user.id) {
    return NextResponse.json({ error: "You do not have permission to restore this campaign." }, { status: 403 });
  }

  let campaignUpdate = supabase
    .from("campaigns")
    .update({ archived_at: null, archived_reason: null, archived_by: null })
    .eq("id", campaignId);

  campaignUpdate = accountId ? campaignUpdate.eq("account_id", accountId) : campaignUpdate.eq("user_id", user.id);

  const { data: campaign, error: campaignError } = await campaignUpdate
    .select("*")
    .single();

  if (campaignError || !campaign) return NextResponse.json({ error: campaignError?.message ?? "Campaign not found." }, { status: 404 });

  let assetsUpdate = supabase
    .from("generated_assets")
    .update({ archived_at: null, archived_reason: null, archived_by: null })
    .eq("campaign_id", campaignId)
    .not("archived_at", "is", null);

  assetsUpdate = accountId ? assetsUpdate.eq("account_id", accountId) : assetsUpdate.eq("user_id", user.id);

  const { data: restoredAssets, error: assetError } = await assetsUpdate.select("id,title,asset_type,status");

  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 400 });

  await supabase.from("activity_log").insert({
    account_id: accountId,
    user_id: user.id,
    activity_type: "campaign_restored",
    title: "Campaign restored",
    description: campaign.name ?? campaign.title ?? campaignId,
    metadata: { campaignId, accountId, restoredAssetCount: restoredAssets?.length ?? 0 },
  });

  return NextResponse.json({ ok: true, campaign, restoredAssets: restoredAssets ?? [] });
}
