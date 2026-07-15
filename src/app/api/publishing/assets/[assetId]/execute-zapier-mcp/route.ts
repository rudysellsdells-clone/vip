import { NextResponse } from "next/server";
import { attachAccountPublishingSettingsToAsset } from "@/lib/accounts/account-publishing-settings";
import {
  attachAttributionToPublishingRun,
  persistPublishingAttribution,
  prepareAttributedPublishingPayload,
} from "@/lib/analytics/publishing-attribution";
import { executeZapierMcpWriteAction } from "@/lib/mcp/mcp-write-clients";
import {
  completeZapierMcpPublishingExecution,
  failZapierMcpPublishingExecution,
  isAlreadySentOrPublished,
  isLinkedInPostAsset,
  publishingAssetState,
  publishingChannelForAsset,
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
      { status: preflight.status },
    );
  }

  const config = zapierMcpConfigForAsset(assetForPublishing);

  if (!config.app || !config.action) {
    return NextResponse.json(
      {
        error: missingZapierMcpConfigMessage(asset),
        assetType: assetForPublishing.asset_type,
      },
      { status: 400 },
    );
  }

  const baseParams = buildPublishingOutputParams(assetForPublishing) as Record<string, unknown>;
  const channel = publishingChannelForAsset(assetForPublishing.asset_type);
  const attributed = await prepareAttributedPublishingPayload({
    supabase,
    asset: assetForPublishing,
    params: baseParams,
    channel,
  });
  const assetForExecution = attributed.asset;
  const paramsRecord = attributed.params as Record<string, unknown>;
  const destinationError = validatePublishingDestination({
    asset: assetForExecution,
    params: paramsRecord,
  });

  if (destinationError) {
    return NextResponse.json(
      {
        error: destinationError,
        payloadPreview: {
          app: config.app,
          action: config.action,
          params: paramsRecord,
          attribution: attributed.attribution,
          accountPublishingSettingsResolution:
            assetForExecution.account_publishing_settings_resolution ?? null,
        },
      },
      { status: 400 },
    );
  }

  const instructions = buildPublishingInstructions(assetForExecution);
  let publishingRun: Record<string, any> | null = null;
  let trackingLink: Record<string, unknown> | null = null;
  let attributionWarning: string | null = attributed.attribution.reason;

  try {
    try {
      trackingLink = await persistPublishingAttribution({
        supabase,
        userId: user.id,
        asset: assetForExecution,
        attribution: attributed.attribution,
        accountId: attributed.context.accountId,
      });
    } catch (error) {
      attributionWarning =
        error instanceof Error ? error.message : "Unable to persist the tracking link.";
    }

    const startedRun = await startZapierMcpPublishingExecution({
      supabase,
      userId: user.id,
      asset: assetForExecution,
      assetId,
      config,
      params: paramsRecord,
      instructions,
    });
    publishingRun = startedRun;

    if (attributed.attribution.ready) {
      try {
        const updatedRun = await attachAttributionToPublishingRun({
          supabase,
          runId: startedRun.id,
          userId: user.id,
          asset: assetForExecution,
          attribution: attributed.attribution,
          trackingLink,
        });
        if (updatedRun) publishingRun = updatedRun as Record<string, any>;
      } catch (error) {
        attributionWarning =
          error instanceof Error ? error.message : "Unable to attach attribution to the run.";
      }
    }

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
      asset: assetForExecution,
      config,
      run: publishingRun,
      providerResult: result,
    });

    return NextResponse.json({
      ok: true,
      asset: sentAsset,
      run: completedRun,
      mcp: result,
      attribution: attributed.attribution,
      trackingLink,
      attributionWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await failZapierMcpPublishingExecution({
      supabase,
      userId: user.id,
      assetId,
      asset: assetForExecution,
      config,
      run: publishingRun,
      errorMessage: message,
    });

    return NextResponse.json(
      {
        error: message || "Unable to execute ZapierMCP action.",
        payloadPreview: {
          app: config.app,
          action: config.action,
          params: paramsRecord,
          attribution: attributed.attribution,
        },
        attributionWarning,
      },
      { status: 400 },
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
  const baseParams = buildPublishingOutputParams(assetForPublishing) as Record<string, unknown>;
  const channel = publishingChannelForAsset(assetForPublishing.asset_type);
  const attributed = await prepareAttributedPublishingPayload({
    supabase,
    asset: assetForPublishing,
    params: baseParams,
    channel,
  });
  const paramsRecord = attributed.params as Record<string, unknown>;
  const destinationError = validatePublishingDestination({
    asset: attributed.asset,
    params: paramsRecord,
  });

  return NextResponse.json({
    ok: true,
    assetId,
    alreadySentOrPublished: isAlreadySentOrPublished(attributed.asset),
    approvedForPublishing: isApprovedForPublishing(attributed.asset),
    assetState: publishingAssetState(attributed.asset),
    app: config.app || null,
    action: config.action || null,
    params: paramsRecord,
    attribution: attributed.attribution,
    taxonomySettings: attributed.context.settings,
    accountPublishingSettingsResolution:
      attributed.asset.account_publishing_settings_resolution ?? null,
    accountPublishingSettingsFound: Boolean(
      attributed.asset.account_publishing_settings,
    ),
    linkedinDestinationLocked: isLinkedInPostAsset(attributed.asset.asset_type)
      ? !destinationError
      : null,
    linkedinDestinationError: destinationError || null,
    instructions: buildPublishingInstructions(attributed.asset),
  });
}
