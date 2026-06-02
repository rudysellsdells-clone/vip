import { NextResponse } from "next/server";
import { markAssetSentToZapier } from "@/lib/assets/asset-lifecycle";
import { executeZapierMcpWriteAction } from "@/lib/mcp/mcp-write-clients";
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
    const result = await executeZapierMcpWriteAction({
      app: config.app,
      action: config.action,
      instructions: buildPublishingInstructions(asset),
      params,
      output:
        "Return the created record id, url if available, status, and a concise message.",
    });

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
    approvedForPublishing: isApprovedForPublishing(asset),
    app: config.app || null,
    action: config.action || null,
    params: buildPublishingOutputParams(asset),
    instructions: buildPublishingInstructions(asset),
  });
}
