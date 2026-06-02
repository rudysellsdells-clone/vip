export type PublishingAsset = Record<string, any>;

export function assetTypeLabel(value: unknown) {
  return String(value ?? "asset").replaceAll("_", " ");
}

export function isActiveLatestAsset(asset: PublishingAsset) {
  if (!asset) return false;
  if (asset.archived_at) return false;
  if (asset.is_active_version === false) return false;
  if (asset.superseded_by_asset_id) return false;
  return true;
}

export function isApprovedForPublishing(asset: PublishingAsset) {
  if (!isActiveLatestAsset(asset)) return false;
  return String(asset.status ?? "") === "approved";
}

export function zapierMcpConfigForAsset(asset: PublishingAsset) {
  const assetType = String(asset.asset_type ?? "").toLowerCase();

  const configByType: Record<string, { app?: string; action?: string }> = {
    blog_post: {
      app: process.env.ZAPIER_MCP_BLOG_POST_APP,
      action: process.env.ZAPIER_MCP_BLOG_POST_ACTION,
    },
    linkedin_post: {
      app: process.env.ZAPIER_MCP_LINKEDIN_POST_APP,
      action: process.env.ZAPIER_MCP_LINKEDIN_POST_ACTION,
    },
    facebook_post: {
      app: process.env.ZAPIER_MCP_FACEBOOK_POST_APP,
      action: process.env.ZAPIER_MCP_FACEBOOK_POST_ACTION,
    },
    email: {
      app: process.env.ZAPIER_MCP_EMAIL_APP,
      action: process.env.ZAPIER_MCP_EMAIL_ACTION,
    },
    video_script: {
      app: process.env.ZAPIER_MCP_VIDEO_SCRIPT_APP,
      action: process.env.ZAPIER_MCP_VIDEO_SCRIPT_ACTION,
    },
  };

  const specific = configByType[assetType] ?? {};

  return {
    app: specific.app ?? process.env.ZAPIER_MCP_DEFAULT_APP ?? "",
    action: specific.action ?? process.env.ZAPIER_MCP_DEFAULT_ACTION ?? "",
  };
}

export function buildPublishingOutputParams(asset: PublishingAsset) {
  return {
    asset_id: String(asset.id ?? ""),
    assetId: String(asset.id ?? ""),
    asset_type: String(asset.asset_type ?? ""),
    assetType: String(asset.asset_type ?? ""),
    title: String(asset.title ?? ""),
    content: String(asset.content ?? ""),
    body: String(asset.content ?? ""),
    text: String(asset.content ?? ""),
    campaign_id: asset.campaign_id ?? null,
    campaignId: asset.campaign_id ?? null,
    intended_publish_month: asset.intended_publish_month ?? null,
    intendedPublishMonth: asset.intended_publish_month ?? null,
    planned_publish_date: asset.planned_publish_date ?? null,
    plannedPublishDate: asset.planned_publish_date ?? null,
    scheduled_publish_at: asset.scheduled_publish_at ?? null,
    scheduledPublishAt: asset.scheduled_publish_at ?? null,
    publish_timezone: asset.publish_timezone ?? "America/Chicago",
    publishTimezone: asset.publish_timezone ?? "America/Chicago",
    quality_workflow_status: asset.quality_workflow_status ?? null,
    qualityWorkflowStatus: asset.quality_workflow_status ?? null,
    status: asset.status ?? null,
    source: "vip",
  };
}

export function buildPublishingInstructions(asset: PublishingAsset) {
  const assetType = assetTypeLabel(asset.asset_type);

  return [
    `Send this approved VIP ${assetType} to the configured Zapier destination.`,
    "Use the params object as the source of truth.",
    "Do not invent missing facts, statistics, claims, dates, or links.",
    "Return the created record id, url if available, status, and a concise human-readable message.",
  ].join(" ");
}

export function missingZapierMcpConfigMessage(asset: PublishingAsset) {
  const assetType = String(asset.asset_type ?? "unknown");

  return [
    `ZapierMCP is not configured for asset type: ${assetType}.`,
    "Set ZAPIER_MCP_DEFAULT_APP and ZAPIER_MCP_DEFAULT_ACTION,",
    "or set asset-specific env vars such as ZAPIER_MCP_LINKEDIN_POST_APP and ZAPIER_MCP_LINKEDIN_POST_ACTION.",
  ].join(" ");
}
