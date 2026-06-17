import { NextResponse } from "next/server";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

const REVIEWABLE_TYPES = [
  "facebook_post",
  "linkedin_post",
  "email",
  "gmail_draft",
  "image_prompt",
  "image",
  "video_prompt",
  "video_script",
  "youtube_video",
  "ad_copy",
  "social_post",
  "campaign_asset",
  "blog_post",
  "white_paper",
  "authority_asset",
  "prospect_what_if_story",
];

export async function POST() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;

  if (!activeAccountId) {
    return NextResponse.json({ error: "No active workspace selected." }, { status: 400 });
  }

  if (!accountContext.canManageActiveAccount) {
    return NextResponse.json(
      { error: "You do not have permission to approve all assets in this workspace." },
      { status: 403 },
    );
  }

  const { data: approvedAssets, error } = await supabase
    .from("generated_assets")
    .update({
      status: "approved",
    })
    .eq("account_id", activeAccountId)
    .is("archived_at", null)
    .eq("status", "needs_review")
    .in("asset_type", REVIEWABLE_TYPES)
    .select("id,title,asset_type");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: activeAccountId,
    activity_type: "approval_all_assets_approved",
    title: "All visible review assets approved",
    description: `${approvedAssets?.length ?? 0} assets approved.`,
    metadata: {
      accountId: activeAccountId,
      approvedCount: approvedAssets?.length ?? 0,
      approvedAssetIds: (approvedAssets ?? []).map((asset: Record<string, any>) => asset.id),
    },
  });

  return NextResponse.json({
    ok: true,
    approvedCount: approvedAssets?.length ?? 0,
    approvedAssets: approvedAssets ?? [],
  });
}
