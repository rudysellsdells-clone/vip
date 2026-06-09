import { NextResponse } from "next/server";
import { markAssetSentToZapier } from "@/lib/assets/asset-lifecycle";
import {
  attachAccountPublishingSettingsToAsset,
  isLikelyLinkedInOrganizationId,
} from "@/lib/accounts/account-publishing-settings";
import { executeZapierMcpWriteAction } from "@/lib/mcp/mcp-write-clients";
import { assertSuccessfulMcpResult } from "@/lib/publishing/mcp-result-guard";
import {
  completePublishingExecutionRun,
  createPublishingExecutionRun,
  failPublishingExecutionRun,
  isAlreadySentOrPublished,
  publishingExecutionReferenceFromMcpResult,
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

function isLinkedInPostAsset(assetType: unknown) {
  return String(assetType ?? "").toLowerCase() === "linkedin_post";
}

function validateLinkedInDestination({
  asset,
  params,
}: {
  asset: Record<string, any>;
  params: Record<string, unknown>;
}) {
  if (!isLinkedInPostAsset(asset.asset_type)) {
    return "";
  }

  const companyId = String(params.company_id ?? "").trim();
  const pageName = String(params.linkedin_page_name ?? params.company_name ?? "").trim();

  if (!companyId) {
    return [
      "LinkedIn destination is not locked. VIP needs the real LinkedIn organization/company ID before publishing.",
      pageName ? `The page label is ${pageName}, but that is not enough for params.company_id.` : "The LinkedIn page label is also missing.",
      "Add the actual LinkedIn organization ID in the account Publishing settings, then retry.",
    ].join(" ");
  }

  if (!isLikelyLinkedInOrganizationId(companyId)) {
    return [
      `LinkedIn company_id looks like a page name instead of an organization ID: ${companyId}.`,
      "Do not publish because Zapier may fall back to the wrong connected LinkedIn page.",
      "Use a numeric organization ID or urn:li:organization:<id> in the account Publishing settings.",
    ].join(" ");
  }

  return "";
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

  const assetForPublishing = await attachAccountPublishingSettingsToAsset({
    supabase,
    asset,
  });

  if (isAlreadySentOrPublished(assetForPublishing)) {
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

  if (!isApprovedForPublishing(assetForPublishing)) {
    return NextResponse.json(
      {
        error:
          "Only approved, active, latest-version assets can be sent through ZapierMCP.",
        assetState: {
          status: assetForPublishing.status,
          archived_at: assetForPublishing.archived_at,
          is_active_version: assetForPublishing.is_active_version,
          superseded_by_asset_id: assetForPublishing.superseded_by_asset_id,
        },
      },
      { status: 409 }
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
  const destinationError = validateLinkedInDestination({ asset: assetForPublishing, params: paramsRecord });

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
    assetState: {
      status: assetForPublishing.status,
      scheduling_status: assetForPublishing.scheduling_status,
      published_at: assetForPublishing.published_at,
      published_via: assetForPublishing.published_via,
    },
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