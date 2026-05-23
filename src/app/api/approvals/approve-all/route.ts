import { NextResponse } from "next/server";
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

  const { data: approvedAssets, error } = await supabase
    .from("generated_assets")
    .update({
      status: "approved",
    })
    .eq("user_id", user.id)
    .is("archived_at", null)
    .eq("status", "needs_review")
    .in("asset_type", REVIEWABLE_TYPES)
    .select("id,title,asset_type");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "approval_all_assets_approved",
    title: "All visible review assets approved",
    description: `${approvedAssets?.length ?? 0} assets approved.`,
    metadata: {
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
