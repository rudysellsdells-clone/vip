import { NextResponse } from "next/server";
import { markAssetSentToZapier } from "@/lib/assets/asset-lifecycle";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

const CANONICAL_ZAPIER_MCP_ROUTE = "/api/publishing/assets/[assetId]/execute-zapier-mcp";
const SOCIAL_ASSET_TYPES = new Set(["linkedin_post", "facebook_post"]);

function isSocialAssetType(assetType: unknown) {
  return SOCIAL_ASSET_TYPES.has(String(assetType ?? "").toLowerCase());
}

function canonicalRouteForAsset(assetId: string) {
  return `/api/publishing/assets/${assetId}/execute-zapier-mcp`;
}

async function logLegacyRouteHit({
  supabase,
  userId,
  asset,
  blocked,
}: {
  supabase: any;
  userId: string;
  asset: Record<string, any>;
  blocked: boolean;
}) {
  await supabase.from("activity_log").insert({
    user_id: userId,
    account_id: asset.account_id ?? null,
    activity_type: blocked ? "legacy_zapier_route_blocked" : "legacy_zapier_route_used",
    title: blocked ? "Legacy Zapier webhook route blocked" : "Legacy Zapier webhook route used",
    description: asset.title,
    metadata: {
      assetId: asset.id,
      assetType: asset.asset_type,
      legacyRoute: "/api/publishing/assets/[assetId]/send-to-zapier",
      canonicalRoute: canonicalRouteForAsset(String(asset.id)),
      reason: blocked
        ? "Social publishing must use the canonical ZapierMCP route."
        : "Legacy webhook route was allowed for backward compatibility.",
    },
  });
}

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

  if (isSocialAssetType(asset.asset_type)) {
    await logLegacyRouteHit({ supabase, userId: user.id, asset, blocked: true });

    return NextResponse.json(
      {
        error:
          "The legacy Zapier webhook route is deprecated for social publishing. Use the canonical ZapierMCP execution route instead.",
        deprecated: true,
        blocked: true,
        assetType: asset.asset_type,
        legacyRoute: "/api/publishing/assets/[assetId]/send-to-zapier",
        canonicalRoute: canonicalRouteForAsset(assetId),
        canonicalRouteTemplate: CANONICAL_ZAPIER_MCP_ROUTE,
      },
      { status: 410 }
    );
  }

  await logLegacyRouteHit({ supabase, userId: user.id, asset, blocked: false });

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
    activity_type: "asset_sent_to_legacy_zapier_webhook",
    title: "Asset sent through legacy Zapier webhook route",
    description: sentAsset.title,
    metadata: {
      assetId,
      assetType: sentAsset.asset_type,
      zapierResponse: responseText.slice(0, 500),
    },
  });

  return NextResponse.json({
    ok: true,
    deprecated: true,
    warning:
      "This asset was sent through the legacy Zapier webhook route. New publishing work should use ZapierMCP execution routes.",
    canonicalRoute: canonicalRouteForAsset(assetId),
    asset: sentAsset,
    zapierResponse: responseText,
  });
}
