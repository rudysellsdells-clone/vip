import { NextResponse } from "next/server";
import { markAssetSentToZapier } from "@/lib/assets/asset-lifecycle";
import {
  attachAccountPublishingSettingsToAsset,
  isLikelyLinkedInOrganizationId,
} from "@/lib/accounts/account-publishing-settings";
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

function publishingChannelForAsset(assetType: unknown) {
  const normalized = String(assetType ?? "").toLowerCase();

  if (normalized === "linkedin_post") return "linkedin";
  if (normalized === "facebook_post") return "facebook";
  if (normalized === "email") return "gmail";
  if (normalized === "blog_post") return "wordpress";
  if (normalized === "galaxyai_prompt" || normalized === "galaxyai_image_prompt") return "galaxyai";

  return "manual";
}


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

function publishingDestinationForAsset(assetType: unknown) {
  const normalized = String(assetType ?? "").toLowerCase();

  if (normalized === "linkedin_post") return "LinkedIn Company Page";
  if (normalized === "facebook_post") return "Facebook Page";
  if (normalized === "email") return "Gmail";
  if (normalized === "blog_post") return "WordPress";

  return "ZapierMCP";
}

async function createPublishingExecutionRun({
  supabase,
  userId,
  asset,
  config,
  params,
  instructions,
}: {
  supabase: any;
  userId: string;
  asset: Record<string, any>;
  config: { app: string; action: string; source: string };
  params: Record<string, unknown>;
  instructions: string;
}) {
  const channel = publishingChannelForAsset(asset.asset_type);

  const { data, error } = await supabase
    .from("publishing_execution_runs")
    .insert({
      user_id: userId,
      asset_id: asset.id,
      provider: "zapier_mcp",
      channel,
      action_key: config.action,
      status: "sent_to_provider",
      destination: publishingDestinationForAsset(asset.asset_type),
      instructions,
      params,
      metadata: {
        assetType: asset.asset_type,
        assetTitle: asset.title,
        app: config.app,
        action: config.action,
        configSource: config.source,
        directZapierMcpRoute: true,
        startedAt: new Date().toISOString(),
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create publishing execution audit run.");
  }

  return data as Record<string, any>;
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
  const destinationError = validateLinkedInDestination({ asset: assetForPublishing, params });

  if (destinationError) {
    return NextResponse.json(
      {
        error: destinationError,
        payloadPreview: {
          app: config.app,
          action: config.action,
          params,
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
      params,
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
      },
    });

    const result = await executeZapierMcpWriteAction({
      app: config.app,
      action: config.action,
      instructions,
      params,
      output:
        "Return the created record id, url if available, status, and a concise message.",
    });

    assertSuccessfulMcpResult(result, { requireSuccessEvidence: true });

    const resultReference =
      result.text?.slice(0, 500) ??
      JSON.stringify(result.parsedText ?? {}).slice(0, 500);

    const { data: completedRun, error: completedRunError } = await supabase
      .from("publishing_execution_runs")
      .update({
        status: "completed",
        provider_result: result,
        error: null,
        metadata: {
          ...(publishingRun?.metadata ?? {}),
          completedAt: new Date().toISOString(),
          mcpRequestArguments: result.requestArguments ?? null,
        },
      })
      .eq("id", publishingRun.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (completedRunError) {
      throw new Error(completedRunError.message);
    }

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

    if (publishingRun?.id) {
      await supabase
        .from("publishing_execution_runs")
        .update({
          status: "failed",
          error: message,
          metadata: {
            ...(publishingRun.metadata ?? {}),
            failedAt: new Date().toISOString(),
          },
        })
        .eq("id", publishingRun.id)
        .eq("user_id", user.id);
    }

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
    linkedinDestinationLocked: isLinkedInPostAsset(assetForPublishing.asset_type)
      ? isLikelyLinkedInOrganizationId(params.company_id)
      : null,
    instructions: buildPublishingInstructions(assetForPublishing),
  });
}
