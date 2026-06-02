import { NextResponse } from "next/server";
import { markAssetSentToZapier } from "@/lib/assets/asset-lifecycle";
import { executeZapierMcpWriteAction } from "@/lib/mcp/mcp-write-clients";
import { assertSuccessfulMcpResult } from "@/lib/publishing/mcp-result-guard";
import {
  buildPublishingInstructions,
  buildPublishingOutputParams,
  isApprovedForPublishing,
  missingZapierMcpConfigMessage,
  zapierMcpConfigForAsset,
} from "@/lib/publishing/output-payload";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

function isAlreadySentOrPublished(asset: Record<string, any>) {
  return (
    Boolean(asset.published_at) ||
    String(asset.status ?? "") === "published" ||
    String(asset.status ?? "") === "sent_to_zapier" ||
    String(asset.scheduling_status ?? "") === "published" ||
    String(asset.scheduling_status ?? "") === "sent_to_zapier"
  );
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

  if (isAlreadySentOrPublished(asset)) {
    return NextResponse.json(
      {
        error:
          "This asset is already marked as sent/published. Reset the asset before retesting to prevent duplicate publishing.",
        assetState: {
          status: asset.status,
          scheduling_status: asset.scheduling_status,
          published_at: asset.published_at,
          published_via: asset.published_via,
          published_reference: asset.published_reference,
        },
      },
      { status: 409 }
    );
  }

  if (!isApprovedForPublishing(asset)) {
    return NextResponse.json(
      {
        error:
          "Only approved, active, latest-version assets can be sent through ZapierMCP.",
        assetState: {
          status: asset.status,
          archived_at: asset.archived_at,
          is_active_version: asset.is_active_version,
          superseded_by_asset_id: asset.superseded_by_asset_id,
        },
      },
      { status: 409 }
    );
  }

  const config = zapierMcpConfigForAsset(asset);

  if (!config.app || !config.action) {
    return NextResponse.json(
      {
        error: missingZapierMcpConfigMessage(asset),
        assetType: asset.asset_type,
      },
      { status: 400 }
    );
  }

  const params = buildPublishingOutputParams(asset);

  try {
    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "asset_zapier_mcp_send_started",
      title: "ZapierMCP send started",
      description: asset.title,
      metadata: {
        assetId,
        assetType: asset.asset_type,
        app: config.app,
        action: config.action,
      },
    });

    const result = await executeZapierMcpWriteAction({
      app: config.app,
      action: config.action,
      instructions: buildPublishingInstructions(asset),
      params,
      output:
        "Return the created record id, url if available, status, and a concise message.",
    });

    assertSuccessfulMcpResult(result, { requireSuccessEvidence: true });

    const sentAsset = await markAssetSentToZapier({
      supabase,
      userId: user.id,
      assetId,
      reference:
        result.text?.slice(0, 500) ??
        JSON.stringify(result.parsedText ?? {}).slice(0, 500),
    });

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "asset_sent_to_zapier_mcp",
      title: "Asset sent to ZapierMCP",
      description: sentAsset.title,
      metadata: {
        assetId,
        assetType: sentAsset.asset_type,
        app: config.app,
        action: config.action,
        mcpResult: result.parsedText ?? result.text ?? null,
        mcpRequestArguments: result.requestArguments ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      asset: sentAsset,
      mcp: result,
    });
  } catch (error) {
    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "asset_zapier_mcp_send_failed",
      title: "ZapierMCP send failed",
      description: asset.title,
      metadata: {
        assetId,
        assetType: asset.asset_type,
        app: config.app,
        action: config.action,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to execute ZapierMCP action.",
        payloadPreview: {
          app: config.app,
          action: config.action,
          params,
        },
      },
      { status: 400 }
    );
  }
}

export async function GET(_request: Request, context: RouteContext) {
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

  const config = zapierMcpConfigForAsset(asset);

  return NextResponse.json({
    ok: true,
    assetId,
    alreadySentOrPublished: isAlreadySentOrPublished(asset),
    approvedForPublishing: isApprovedForPublishing(asset),
    assetState: {
      status: asset.status,
      scheduling_status: asset.scheduling_status,
      published_at: asset.published_at,
      published_via: asset.published_via,
    },
    app: config.app || null,
    action: config.action || null,
    params: buildPublishingOutputParams(asset),
    instructions: buildPublishingInstructions(asset),
  });
}
