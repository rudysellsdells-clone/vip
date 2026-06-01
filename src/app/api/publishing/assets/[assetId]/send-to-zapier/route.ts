import { NextResponse } from "next/server";
import { markAssetSentToZapier } from "@/lib/assets/asset-lifecycle";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

function webhookForAssetType(assetType: string) {
  const normalized = assetType.toLowerCase();

  const specific: Record<string, string | undefined> = {
    blog_post: process.env.ZAPIER_BLOG_POST_WEBHOOK_URL,
    linkedin_post: process.env.ZAPIER_LINKEDIN_POST_WEBHOOK_URL,
    facebook_post: process.env.ZAPIER_FACEBOOK_POST_WEBHOOK_URL,
    email: process.env.ZAPIER_EMAIL_WEBHOOK_URL,
    video_script: process.env.ZAPIER_VIDEO_SCRIPT_WEBHOOK_URL,
  };

  return specific[normalized] ?? process.env.ZAPIER_GENERIC_WEBHOOK_URL;
}

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

  const { data: asset, error: assetError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .single();

  if (assetError || !asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  if (asset.archived_at || asset.is_active_version === false || asset.superseded_by_asset_id) {
    return NextResponse.json(
      { error: "This asset is not the active latest version and cannot be sent." },
      { status: 409 }
    );
  }

  if (String(asset.status ?? "") !== "approved") {
    return NextResponse.json(
      { error: "Only approved assets can be sent to Zapier." },
      { status: 409 }
    );
  }

  const webhookUrl = webhookForAssetType(String(asset.asset_type ?? ""));

  if (!webhookUrl) {
    return NextResponse.json(
      {
        error:
          "Zapier webhook is not configured for this asset type. Add ZAPIER_GENERIC_WEBHOOK_URL or the matching asset-type webhook URL in Vercel.",
        assetType: asset.asset_type,
        expectedEnvVars: [
          "ZAPIER_GENERIC_WEBHOOK_URL",
          "ZAPIER_LINKEDIN_POST_WEBHOOK_URL",
          "ZAPIER_FACEBOOK_POST_WEBHOOK_URL",
          "ZAPIER_BLOG_POST_WEBHOOK_URL",
          "ZAPIER_EMAIL_WEBHOOK_URL",
          "ZAPIER_VIDEO_SCRIPT_WEBHOOK_URL",
        ],
      },
      { status: 400 }
    );
  }

  const payload = {
    assetId: asset.id,
    assetType: asset.asset_type,
    title: asset.title,
    content: asset.content,
    scheduledPublishAt: asset.scheduled_publish_at,
    plannedPublishDate: asset.planned_publish_date,
    campaignId: asset.campaign_id,
    source: "vip",
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Zapier webhook failed: ${response.status} ${response.statusText}`,
        details: responseText.slice(0, 1000),
      },
      { status: 400 }
    );
  }

  const sentAsset = await markAssetSentToZapier({
    supabase,
    userId: user.id,
    assetId,
    reference: responseText.slice(0, 500),
  });

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "asset_sent_to_zapier",
    title: "Asset sent to Zapier",
    description: sentAsset.title,
    metadata: {
      assetId,
      assetType: sentAsset.asset_type,
      zapierResponse: responseText.slice(0, 500),
    },
  });

  return NextResponse.json({
    ok: true,
    asset: sentAsset,
    zapierResponse: responseText,
  });
}
