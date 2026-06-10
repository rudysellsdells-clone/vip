import { NextResponse } from "next/server";
import { attachAccountPublishingSettingsToAsset } from "@/lib/accounts/account-publishing-settings";
import { executeZapierMcpWriteAction } from "@/lib/mcp/mcp-write-clients";
import {
  completeZapierMcpPublishingExecution,
  failZapierMcpPublishingExecution,
  isAlreadySentOrPublished,
  isLinkedInPostAsset,
  publishingAssetState,
  publishingPreflightForAsset,
  startZapierMcpPublishingExecution,
  validatePublishingDestination,
} from "@/lib/publishing/publishing-execution-service";
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

  const assetForPublishing = await attachAccountPublishingSettingsToAsset({
    supabase,
    asset,
  });

  const preflight = publishingPreflightForAsset(assetForPublishing);

  if (!preflight.ok) {
    return NextResponse.json(
      {
        error: preflight.error,
        assetState: preflight.assetState,
      },
      { status: preflight.status }
    );
  }

  const config = zapierMcpConfigForAsset(assetForPublishing);

  if (!config.app || !config.action) {
    return NextResponse.json(
      {
        error: missingZapierMcpConfigMessage(asset),
        assetType: assetForPublishing.asset_type,
      },
      { status: 400 }
    );
  }

  const params = buildPublishingOutputParams(assetForPublishing);
  const paramsRecord = params as Record<string, unknown>;
  const destinationError = validatePublishingDestination({ asset: assetForPublishing, params: paramsRecord });

  if (destinationError) {
    return NextResponse.json(
      {
        error: destinationError,
        payloadPreview: {
          app: config.app,
          action: config.action,
          params,
          accountPublishingSettingsResolution:
            assetForPublishing.account_publishing_settings_resolution ?? null,
        },
      },
      { status: 400 },
    );
  }

  const instructions = buildPublishingInstructions(assetForPublishing);
  let publishingRun: Record<string, any> | null = null;

  try {
    publishingRun = await startZapierMcpPublishingExecution({
      supabase,
      userId: user.id,
      asset: assetForPublishing,
      assetId,
      config,
      params: paramsRecord,
      instructions,
    });

    const result = await executeZapierMcpWriteAction({
      app: config.app,
      action: config.action,
      instructions,
      params: paramsRecord,
      output:
        "Return the created record id, url if available, status, and a concise message.",
    });

    const { sentAsset, completedRun } = await completeZapierMcpPublishingExecution({
      supabase,
      userId: user.id,
      assetId,
      asset: assetForPublishing,
      config,
      run: publishingRun,
      providerResult: result,
    });

    return NextResponse.json({
      ok: true,
      asset: sentAsset,
      run: completedRun,
      mcp: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await failZapierMcpPublishingExecution({
      supabase,
      userId: user.id,
      assetId,
      asset: assetForPublishing,
      config,
      run: publishingRun,
      errorMessage: message,
    });

    return NextResponse.json(
      {
        error:
          message || "Unable to execute ZapierMCP action.",
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

  const assetForPublishing = await attachAccountPublishingSettingsToAsset({
    supabase,
    asset,
  });
  const config = zapierMcpConfigForAsset(assetForPublishing);
  const params = buildPublishingOutputParams(assetForPublishing);
  const paramsRecord = params as Record<string, unknown>;
  const destinationError = validatePublishingDestination({
    asset: assetForPublishing,
    params: paramsRecord,
  });

  return NextResponse.json({
    ok: true,
    assetId,
    alreadySentOrPublished: isAlreadySentOrPublished(assetForPublishing),
    approvedForPublishing: isApprovedForPublishing(assetForPublishing),
    assetState: publishingAssetState(assetForPublishing),
    app: config.app || null,
    action: config.action || null,
    params,
    accountPublishingSettingsResolution:
      assetForPublishing.account_publishing_settings_resolution ?? null,
    accountPublishingSettingsFound:
      Boolean(assetForPublishing.account_publishing_settings),
    linkedinDestinationLocked: isLinkedInPostAsset(assetForPublishing.asset_type)
      ? !destinationError
      : null,
    linkedinDestinationError: destinationError || null,
    instructions: buildPublishingInstructions(assetForPublishing),
  });
}