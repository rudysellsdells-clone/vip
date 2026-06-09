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
