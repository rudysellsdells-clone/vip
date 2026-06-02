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

function buildWordPressParams(asset: PublishingAsset) {
  const title = String(asset.title ?? "");
  const content = String(asset.content ?? "");

  return {
    asset_id: String(asset.id ?? ""),
    asset_type: "blog_post",
    campaign_id: asset.campaign_id ?? null,
    source: "vip",

    post_type: wordpressPostType(),
    post_status: wordpressPostStatus(),

    title,
    content,

    post_title: title,
    post_content: content,
  };
}

function buildFacebookParams(asset: PublishingAsset, config: ZapierMcpAssetConfig) {
  const content = String(asset.content ?? "");
  const pageId = (config.pageId ?? env("ZAPIER_FACEBOOK_PAGE_ID")) || null;
  const pageName = (config.pageName ?? env("ZAPIER_FACEBOOK_PAGE_NAME")) || null;

  return {
    asset_id: String(asset.id ?? ""),
    asset_type: "facebook_post",
    campaign_id: asset.campaign_id ?? null,
    source: "vip",

    message: content,
    content,

    Page: pageId,
    page: pageId,
    page_id: pageId,
    pageId,
    facebook_page_id: pageId,
    facebookPageId: pageId,

    page_name: pageName,
    pageName,
    facebook_page_name: pageName,
    facebookPageName: pageName,

    scheduled_publish_at: asset.scheduled_publish_at ?? null,
  };
}

function buildLinkedInParams(asset: PublishingAsset, config: ZapierMcpAssetConfig) {
  const content = String(asset.content ?? "");

  return {
    asset_id: String(asset.id ?? ""),
    asset_type: String(asset.asset_type ?? ""),
    campaign_id: asset.campaign_id ?? null,
    text: content,
    content,
    linkedin_page_name: config.pageName ?? null,
    scheduled_publish_at: asset.scheduled_publish_at ?? null,
    source: "vip",
  };
}

function buildGenericParams(asset: PublishingAsset) {
  return {
    asset_id: String(asset.id ?? ""),
    asset_type: String(asset.asset_type ?? ""),
    title: String(asset.title ?? ""),
    content: String(asset.content ?? ""),
    campaign_id: asset.campaign_id ?? null,
    scheduled_publish_at: asset.scheduled_publish_at ?? null,
    source: "vip",
  };
}

export function buildPublishingOutputParams(asset: PublishingAsset) {
  const config = zapierMcpConfigForAsset(asset);
  const assetType = String(asset.asset_type ?? "").toLowerCase();

  if (assetType === "blog_post") {
    return buildWordPressParams(asset);
  }

  if (assetType === "facebook_post") {
    return buildFacebookParams(asset, config);
  }

  if (assetType === "linkedin_post") {
    return buildLinkedInParams(asset, config);
  }

  return buildGenericParams(asset);
}

function buildFacebookInstructions(config: ZapierMcpAssetConfig) {
  const pageId = (config.pageId ?? env("ZAPIER_FACEBOOK_PAGE_ID")) || "";
  const pageName = (config.pageName ?? env("ZAPIER_FACEBOOK_PAGE_NAME")) || "";

  return [
    "Create a Facebook Page post using the structured params provided with this tool call.",
    "",
    "Critical:",
    '- For the required Facebook Pages "Page" field, use exactly this value:',
    pageId || "[missing Facebook page id]",
    "",
    "Allowed Page handle / safety lock:",
    pageName || "[missing Facebook page name]",
    "",
    "Use params.message as the Facebook post body.",
    "Do not route this to WordPress.",
    "Do not ask a follow-up question if params.message and the locked Page value are present.",
    "Return the created post id, URL/permalink if available, status, and a concise confirmation message.",
  ].join("\\n");
}

export function buildPublishingInstructions(asset: PublishingAsset) {
  const assetType = assetTypeLabel(asset.asset_type);
  const config = zapierMcpConfigForAsset(asset);
  const normalizedAssetType = String(asset.asset_type ?? "").toLowerCase();

  if (normalizedAssetType === "facebook_post") {
    return buildFacebookInstructions(config);
  }

  return [
    `Send this approved VIP ${assetType} to the configured Zapier destination.`,
    "Use the params object as the source of truth.",
    normalizedAssetType === "blog_post"
      ? `For WordPress, use params.post_type=${wordpressPostType()}, params.post_status=${wordpressPostStatus()}, params.post_title or params.title for the title, and params.post_content or params.content for the body.`
      : "",
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
