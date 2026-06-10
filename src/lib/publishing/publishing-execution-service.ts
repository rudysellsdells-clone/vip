import { markAssetSentToZapier } from "@/lib/assets/asset-lifecycle";
import { isLikelyLinkedInOrganizationId } from "@/lib/accounts/account-publishing-settings";
import { assertSuccessfulMcpResult } from "@/lib/publishing/mcp-result-guard";
import { isApprovedForPublishing } from "@/lib/publishing/output-payload";

export type PublishingAssetRecord = Record<string, any>;
export type PublishingRunRecord = Record<string, any>;

export type PublishingExecutionConfig = {
  app: string;
  action: string;
  source?: string | null;
};

export type SupabaseLike = {
  from: (table: string) => any;
};

export function isAlreadySentOrPublished(asset: PublishingAssetRecord) {
  return (
    Boolean(asset.published_at) ||
    String(asset.status ?? "") === "published" ||
    String(asset.status ?? "") === "sent_to_zapier" ||
    String(asset.scheduling_status ?? "") === "published" ||
    String(asset.scheduling_status ?? "") === "sent_to_zapier"
  );
}

export function publishingAssetState(asset: PublishingAssetRecord) {
  return {
    status: asset.status ?? null,
    scheduling_status: asset.scheduling_status ?? null,
    published_at: asset.published_at ?? null,
    published_via: asset.published_via ?? null,
    published_reference: asset.published_reference ?? null,
    archived_at: asset.archived_at ?? null,
    is_active_version: asset.is_active_version ?? null,
    superseded_by_asset_id: asset.superseded_by_asset_id ?? null,
  };
}

export function publishingPreflightForAsset(asset: PublishingAssetRecord) {
  if (isAlreadySentOrPublished(asset)) {
    return {
      ok: false,
      status: 409,
      error:
        "This asset is already marked as sent/published. Reset the asset before retesting to prevent duplicate publishing.",
      assetState: publishingAssetState(asset),
    };
  }

  if (!isApprovedForPublishing(asset)) {
    return {
      ok: false,
      status: 409,
      error:
        "Only approved, active, latest-version assets can be sent through ZapierMCP.",
      assetState: publishingAssetState(asset),
    };
  }

  return {
    ok: true,
    status: 200,
    error: "",
    assetState: publishingAssetState(asset),
  };
}

export function isLinkedInPostAsset(assetType: unknown) {
  return String(assetType ?? "").toLowerCase() === "linkedin_post";
}

export function validatePublishingDestination({
  asset,
  params,
}: {
  asset: PublishingAssetRecord;
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

export function publishingChannelForAsset(assetType: unknown) {
  const normalized = String(assetType ?? "").toLowerCase();

  if (normalized === "linkedin_post") return "linkedin";
  if (normalized === "facebook_post") return "facebook";
  if (normalized === "email") return "gmail";
  if (normalized === "blog_post") return "wordpress";
  if (normalized === "galaxyai_prompt" || normalized === "galaxyai_image_prompt") return "galaxyai";

  return "manual";
}

export function publishingDestinationForAsset(assetType: unknown) {
  const normalized = String(assetType ?? "").toLowerCase();

  if (normalized === "linkedin_post") return "LinkedIn Company Page";
  if (normalized === "facebook_post") return "Facebook Page";
  if (normalized === "email") return "Gmail";
  if (normalized === "blog_post") return "WordPress";

  return "ZapierMCP";
}

export function publishingExecutionReferenceFromMcpResult(result: Record<string, any>) {
  return (
    result.text?.slice(0, 500) ??
    JSON.stringify(result.parsedText ?? {}).slice(0, 500)
  );
}

function executionMetadata({
  asset,
  config,
  additionalMetadata = {},
}: {
  asset: PublishingAssetRecord;
  config: PublishingExecutionConfig;
  additionalMetadata?: Record<string, unknown>;
}) {
  return {
    assetType: asset.asset_type,
    assetTitle: asset.title,
    app: config.app,
    action: config.action,
    configSource: config.source ?? null,
    directZapierMcpRoute: true,
    ...additionalMetadata,
  };
}

export async function createPublishingExecutionRun({
  supabase,
  userId,
  asset,
  config,
  params,
  instructions,
}: {
  supabase: SupabaseLike;
  userId: string;
  asset: PublishingAssetRecord;
  config: PublishingExecutionConfig;
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
      metadata: executionMetadata({
        asset,
        config,
        additionalMetadata: {
          startedAt: new Date().toISOString(),
        },
      }),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create publishing execution audit run.");
  }

  return data as PublishingRunRecord;
}

export async function completePublishingExecutionRun({
  supabase,
  userId,
  run,
  providerResult,
}: {
  supabase: SupabaseLike;
  userId: string;
  run: PublishingRunRecord | null;
  providerResult: Record<string, any>;
}) {
  if (!run?.id) {
    throw new Error("Publishing execution run was not created before completion.");
  }

  const { data, error } = await supabase
    .from("publishing_execution_runs")
    .update({
      status: "completed",
      provider_result: providerResult,
      error: null,
      metadata: {
        ...(run?.metadata ?? {}),
        completedAt: new Date().toISOString(),
        mcpRequestArguments: providerResult.requestArguments ?? null,
      },
    })
    .eq("id", run.id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PublishingRunRecord;
}

export async function failPublishingExecutionRun({
  supabase,
  userId,
  run,
  errorMessage,
}: {
  supabase: SupabaseLike;
  userId: string;
  run: PublishingRunRecord | null;
  errorMessage: string;
}) {
  if (!run?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("publishing_execution_runs")
    .update({
      status: "failed",
      error: errorMessage,
      metadata: {
        ...(run.metadata ?? {}),
        failedAt: new Date().toISOString(),
      },
    })
    .eq("id", run.id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as PublishingRunRecord | null;
}

async function insertPublishingActivity({
  supabase,
  userId,
  activityType,
  title,
  description,
  metadata,
}: {
  supabase: SupabaseLike;
  userId: string;
  activityType: string;
  title: string;
  description?: string | null;
  metadata: Record<string, unknown>;
}) {
  await supabase.from("activity_log").insert({
    user_id: userId,
    activity_type: activityType,
    title,
    description,
    metadata,
  });
}

export async function startZapierMcpPublishingExecution({
  supabase,
  userId,
  asset,
  assetId,
  config,
  params,
  instructions,
}: {
  supabase: SupabaseLike;
  userId: string;
  asset: PublishingAssetRecord;
  assetId: string;
  config: PublishingExecutionConfig;
  params: Record<string, unknown>;
  instructions: string;
}) {
  const publishingRun = await createPublishingExecutionRun({
    supabase,
    userId,
    asset,
    config,
    params,
    instructions,
  });

  await insertPublishingActivity({
    supabase,
    userId,
    activityType: "asset_zapier_mcp_send_started",
    title: "ZapierMCP send started",
    description: asset.title,
    metadata: {
      assetId,
      runId: publishingRun.id,
      assetType: asset.asset_type,
      app: config.app,
      action: config.action,
      accountPublishingSettingsResolution:
        asset.account_publishing_settings_resolution ?? null,
    },
  });

  return publishingRun;
}

export async function completeZapierMcpPublishingExecution({
  supabase,
  userId,
  assetId,
  asset,
  config,
  run,
  providerResult,
}: {
  supabase: SupabaseLike;
  userId: string;
  assetId: string;
  asset: PublishingAssetRecord;
  config: PublishingExecutionConfig;
  run: PublishingRunRecord | null;
  providerResult: Record<string, any>;
}) {
  assertSuccessfulMcpResult(providerResult, { requireSuccessEvidence: true });

  const resultReference = publishingExecutionReferenceFromMcpResult(providerResult);

  const completedRun = await completePublishingExecutionRun({
    supabase,
    userId,
    run,
    providerResult,
  });

  const sentAsset = await markAssetSentToZapier({
    supabase,
    userId,
    assetId,
    reference: resultReference,
  });

  await insertPublishingActivity({
    supabase,
    userId,
    activityType: "asset_sent_to_zapier_mcp",
    title: "Asset sent to ZapierMCP",
    description: sentAsset.title,
    metadata: {
      assetId,
      runId: completedRun?.id ?? run?.id ?? null,
      assetType: sentAsset.asset_type,
      app: config.app,
      action: config.action,
      accountPublishingSettingsResolution:
        asset.account_publishing_settings_resolution ?? null,
      mcpResult: providerResult.parsedText ?? providerResult.text ?? null,
      mcpRequestArguments: providerResult.requestArguments ?? null,
    },
  });

  return {
    sentAsset,
    completedRun,
    resultReference,
  };
}

export async function failZapierMcpPublishingExecution({
  supabase,
  userId,
  assetId,
  asset,
  config,
  run,
  errorMessage,
}: {
  supabase: SupabaseLike;
  userId: string;
  assetId: string;
  asset: PublishingAssetRecord;
  config: PublishingExecutionConfig;
  run: PublishingRunRecord | null;
  errorMessage: string;
}) {
  const failedRun = await failPublishingExecutionRun({
    supabase,
    userId,
    run,
    errorMessage,
  });

  await insertPublishingActivity({
    supabase,
    userId,
    activityType: "asset_zapier_mcp_send_failed",
    title: "ZapierMCP send failed",
    description: asset.title,
    metadata: {
      assetId,
      runId: run?.id ?? null,
      assetType: asset.asset_type,
      app: config.app,
      action: config.action,
      accountPublishingSettingsResolution:
        asset.account_publishing_settings_resolution ?? null,
      error: errorMessage,
    },
  });

  return failedRun;
}

