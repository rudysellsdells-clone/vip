import { NextResponse } from "next/server";
import { markAssetSentToZapier } from "@/lib/assets/asset-lifecycle";
import { attachAccountPublishingSettingsToAsset } from "@/lib/accounts/account-publishing-settings";
import { executeZapierMcpWriteAction } from "@/lib/mcp/mcp-write-clients";
import { assertSuccessfulMcpResult } from "@/lib/publishing/mcp-result-guard";
import {
  completePublishingExecutionRun,
  createPublishingExecutionRun,
  failPublishingExecutionRun,
  isAlreadySentOrPublished,
  isLinkedInPostAsset,
  publishingAssetState,
  publishingExecutionReferenceFromMcpResult,
  publishingPreflightForAsset,
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
    publishingRun = await createPublishingExecutionRun({
      supabase,
      userId: user.id,
      asset: assetForPublishing,
      config,
      params: paramsRecord,
      instructions,
    });

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "asset_zapier_mcp_send_started",
      title: "ZapierMCP send started",
      description: assetForPublishing.title,
      metadata: {
        assetId,
        runId: publishingRun.id,
        assetType: asset.asset_type,
        app: config.app,
        action: config.action,
        accountPublishingSettingsResolution:
          assetForPublishing.account_publishing_settings_resolution ?? null,
      },
    });

    const result = await executeZapierMcpWriteAction({
      app: config.app,
      action: config.action,
      instructions,
      params: paramsRecord,
      output:
        "Return the created record id, url if available, status, and a concise message.",
    });

    assertSuccessfulMcpResult(result, { requireSuccessEvidence: true });

    const resultReference = publishingExecutionReferenceFromMcpResult(result);

    const completedRun = await completePublishingExecutionRun({
      supabase,
      userId: user.id,
      run: publishingRun,
      providerResult: result,
    });

    const sentAsset = await markAssetSentToZapier({
      supabase,
      userId: user.id,
      assetId,
      reference: resultReference,
    });

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "asset_sent_to_zapier_mcp",
      title: "Asset sent to ZapierMCP",
      description: sentAsset.title,
      metadata: {
        assetId,
        runId: completedRun?.id ?? publishingRun?.id ?? null,
        assetType: sentAsset.asset_type,
        app: config.app,
        action: config.action,
        accountPublishingSettingsResolution:
          assetForPublishing.account_publishing_settings_resolution ?? null,
        mcpResult: result.parsedText ?? result.text ?? null,
        mcpRequestArguments: result.requestArguments ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      asset: sentAsset,
      run: completedRun,
      mcp: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await failPublishingExecutionRun({
      supabase,
      userId: user.id,
      run: publishingRun,
      errorMessage: message,
    });

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "asset_zapier_mcp_send_failed",
      title: "ZapierMCP send failed",
      description: asset.title,
      metadata: {
        assetId,
        runId: publishingRun?.id ?? null,
        assetType: asset.asset_type,
        app: config.app,
        action: config.action,
        accountPublishingSettingsResolution:
          assetForPublishing.account_publishing_settings_resolution ?? null,
        error: message,
      },
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
      ? isLikelyLinkedInOrganizationId(String(paramsRecord.company_id ?? ""))
      : null,
    instructions: buildPublishingInstructions(assetForPublishing),
  });
}