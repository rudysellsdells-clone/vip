export type PublishingAsset = Record<string, any>;

export type ZapierMcpAssetConfig = {
  app: string;
  action: string;
  source: string;
  pageId?: string | null;
  pageName?: string | null;
};

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

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function firstValue(...values: Array<string | undefined | null>) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function wordpressPostType() {
  /*
    Zapier WordPress requires post_type.
    WordPress REST/Zapier action mappings commonly expect "post" for standard posts.
    This can be overridden in Vercel if the action expects a custom post type.
  */
  return firstValue(env("WORDPRESS_DEFAULT_POST_TYPE"), env("ZAPIER_WORDPRESS_DEFAULT_POST_TYPE"), "post");
}

function wordpressPostStatus() {
  return firstValue(env("WORDPRESS_DEFAULT_POST_STATUS"), "draft");
}

export function zapierMcpConfigForAsset(asset: PublishingAsset): ZapierMcpAssetConfig {
  const assetType = String(asset.asset_type ?? "").toLowerCase();

  if (assetType === "facebook_post") {
    return {
      app: firstValue(env("ZAPIER_MCP_FACEBOOK_POST_APP"), env("ZAPIER_MCP_DEFAULT_APP"), "Facebook Pages"),
      action: firstValue(env("ZAPIER_MCP_FACEBOOK_POST_ACTION"), env("ZAPIER_FACEBOOK_MCP_TOOL_NAME"), env("ZAPIER_MCP_DEFAULT_ACTION")),
      source: env("ZAPIER_MCP_FACEBOOK_POST_ACTION")
        ? "asset_specific"
        : env("ZAPIER_FACEBOOK_MCP_TOOL_NAME")
          ? "legacy_facebook_tool_name"
          : env("ZAPIER_MCP_DEFAULT_ACTION")
            ? "default"
            : "missing_action",
      pageId: env("ZAPIER_FACEBOOK_PAGE_ID") || null,
      pageName: env("ZAPIER_FACEBOOK_PAGE_NAME") || null,
    };
  }

  if (assetType === "linkedin_post") {
    return {
      app: firstValue(env("ZAPIER_MCP_LINKEDIN_POST_APP"), env("ZAPIER_MCP_DEFAULT_APP"), "LinkedIn"),
      action: firstValue(env("ZAPIER_MCP_LINKEDIN_POST_ACTION"), env("ZAPIER_LINKEDIN_MCP_TOOL_NAME"), env("ZAPIER_MCP_DEFAULT_ACTION")),
      source: env("ZAPIER_MCP_LINKEDIN_POST_ACTION")
        ? "asset_specific"
        : env("ZAPIER_LINKEDIN_MCP_TOOL_NAME")
          ? "legacy_linkedin_tool_name"
          : env("ZAPIER_MCP_DEFAULT_ACTION")
            ? "default"
            : "missing_action",
      pageId: null,
      pageName: env("ZAPIER_LINKEDIN_PAGE_NAME") || null,
    };
  }

  if (assetType === "blog_post") {
    return {
      app: firstValue(env("ZAPIER_MCP_BLOG_POST_APP"), env("ZAPIER_MCP_DEFAULT_APP"), "WordPress"),
      action: firstValue(env("ZAPIER_MCP_BLOG_POST_ACTION"), env("ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY"), env("ZAPIER_MCP_DEFAULT_ACTION")),
      source: env("ZAPIER_MCP_BLOG_POST_ACTION")
        ? "asset_specific"
        : env("ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY")
          ? "legacy_wordpress_action_key"
          : env("ZAPIER_MCP_DEFAULT_ACTION")
            ? "default"
            : "missing_action",
      pageId: null,
      pageName: null,
    };
  }

  if (assetType === "email") {
    return {
      app: firstValue(env("ZAPIER_MCP_EMAIL_APP"), env("ZAPIER_GMAIL_APP"), env("ZAPIER_MCP_DEFAULT_APP"), "Gmail"),
      action: firstValue(env("ZAPIER_MCP_EMAIL_ACTION"), env("ZAPIER_GMAIL_CREATE_DRAFT_ACTION"), env("ZAPIER_MCP_DEFAULT_ACTION")),
      source: env("ZAPIER_MCP_EMAIL_ACTION")
        ? "asset_specific"
        : env("ZAPIER_GMAIL_CREATE_DRAFT_ACTION")
          ? "legacy_gmail_create_draft_action"
          : env("ZAPIER_MCP_DEFAULT_ACTION")
            ? "default"
            : "missing_action",
      pageId: null,
      pageName: null,
    };
  }

  if (assetType === "video_script") {
    return {
      app: firstValue(env("ZAPIER_MCP_VIDEO_SCRIPT_APP"), env("ZAPIER_MCP_DEFAULT_APP")),
      action: firstValue(env("ZAPIER_MCP_VIDEO_SCRIPT_ACTION"), env("ZAPIER_MCP_DEFAULT_ACTION")),
      source: env("ZAPIER_MCP_VIDEO_SCRIPT_ACTION")
        ? "asset_specific"
        : env("ZAPIER_MCP_DEFAULT_ACTION")
          ? "default"
          : "missing_action",
      pageId: null,
      pageName: null,
    };
  }

  return {
    app: env("ZAPIER_MCP_DEFAULT_APP"),
    action: env("ZAPIER_MCP_DEFAULT_ACTION"),
    source: env("ZAPIER_MCP_DEFAULT_ACTION") ? "default" : "missing_action",
    pageId: null,
    pageName: null,
  };
}

export function buildPublishingOutputParams(asset: PublishingAsset) {
  const config = zapierMcpConfigForAsset(asset);
  const assetType = String(asset.asset_type ?? "");
  const title = String(asset.title ?? "");
  const content = String(asset.content ?? "");
  const isBlogPost = assetType === "blog_post";

  return {
    asset_id: String(asset.id ?? ""),
    assetId: String(asset.id ?? ""),

    asset_type: assetType,
    assetType,

    title,
    content,
    body: content,
    text: content,

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

    /*
      WordPress-specific fields.
      These are included for all assets but only populated for blog_post so the WordPress
      Zapier action receives the required post_type field and common post aliases.
    */
    post_type: isBlogPost ? wordpressPostType() : null,
    postType: isBlogPost ? wordpressPostType() : null,
    post_status: isBlogPost ? wordpressPostStatus() : null,
    postStatus: isBlogPost ? wordpressPostStatus() : null,
    post_title: isBlogPost ? title : null,
    postTitle: isBlogPost ? title : null,
    post_content: isBlogPost ? content : null,
    postContent: isBlogPost ? content : null,

    facebook_page_id: config.pageId ?? null,
    facebookPageId: config.pageId ?? null,
    facebook_page_name: config.pageName ?? null,
    facebookPageName: config.pageName ?? null,

    linkedin_page_name: assetType === "linkedin_post" ? config.pageName ?? null : null,
    linkedInPageName: assetType === "linkedin_post" ? config.pageName ?? null : null,

    wordpress_default_post_status: wordpressPostStatus(),
    wordpressDefaultPostStatus: wordpressPostStatus(),

    source: "vip",
  };
}

export function buildPublishingInstructions(asset: PublishingAsset) {
  const assetType = assetTypeLabel(asset.asset_type);
  const config = zapierMcpConfigForAsset(asset);
  const isBlogPost = String(asset.asset_type ?? "") === "blog_post";

  return [
    `Send this approved VIP ${assetType} to the configured Zapier destination.`,
    "Use the params object as the source of truth.",
    isBlogPost ? `For WordPress, use post_type=${wordpressPostType()} and post_status=${wordpressPostStatus()}.` : "",
    config.pageName ? `Use destination page/account: ${config.pageName}.` : "",
    config.pageId ? `Use destination page id: ${config.pageId}.` : "",
    "Do not invent missing facts, statistics, claims, dates, or links.",
    "Return the created record id, url if available, status, and a concise human-readable message.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function missingZapierMcpConfigMessage(asset: PublishingAsset) {
  const assetType = String(asset.asset_type ?? "unknown");

  if (assetType === "facebook_post") {
    return [
      "ZapierMCP is not configured for facebook_post.",
      "You already have Facebook page variables, but no Facebook action key variable was found.",
      "Add ZAPIER_FACEBOOK_MCP_TOOL_NAME or ZAPIER_MCP_FACEBOOK_POST_ACTION in Vercel.",
    ].join(" ");
  }

  return [
    `ZapierMCP is not configured for asset type: ${assetType}.`,
    "Set ZAPIER_MCP_DEFAULT_APP and ZAPIER_MCP_DEFAULT_ACTION,",
    "or set asset-specific env vars such as ZAPIER_MCP_LINKEDIN_POST_APP and ZAPIER_MCP_LINKEDIN_POST_ACTION.",
  ].join(" ");
}
