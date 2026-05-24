export type PublishingRoute = {
  provider: "zapier" | "galaxyai";
  channel: "linkedin" | "facebook" | "gmail" | "galaxyai" | "wordpress";
  actionKey: string;
  destinationLabel: string;
  requiresConfiguredAction: boolean;
};

export const PUBLISHABLE_ASSET_TYPES = [
  "linkedin_post",
  "facebook_post",
  "email",
  "video_script",
  "blog_post",
];

function envValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

export function getPublishingRoute(assetType: string | null | undefined): PublishingRoute | null {
  switch (assetType) {
    case "linkedin_post":
      return {
        provider: "zapier",
        channel: "linkedin",
        actionKey: envValue(
          "ZAPIER_LINKEDIN_CREATE_POST_ACTION_KEY",
          "LINKEDIN_CREATE_POST_ACTION_KEY",
          "NEXT_PUBLIC_ZAPIER_LINKEDIN_CREATE_POST_ACTION_KEY"
        ),
        destinationLabel: "LinkedIn",
        requiresConfiguredAction: true,
      };

    case "facebook_post":
      return {
        provider: "zapier",
        channel: "facebook",
        actionKey: envValue(
          "ZAPIER_FACEBOOK_CREATE_POST_ACTION_KEY",
          "FACEBOOK_CREATE_POST_ACTION_KEY",
          "NEXT_PUBLIC_ZAPIER_FACEBOOK_CREATE_POST_ACTION_KEY"
        ),
        destinationLabel: "Facebook",
        requiresConfiguredAction: true,
      };

    case "email":
      return {
        provider: "zapier",
        channel: "gmail",
        actionKey: envValue(
          "ZAPIER_GMAIL_DRAFT_ACTION_KEY",
          "GMAIL_DRAFT_ACTION_KEY",
          "GMAIL_CREATE_DRAFT_ACTION_KEY",
          "NEXT_PUBLIC_ZAPIER_GMAIL_DRAFT_ACTION_KEY"
        ),
        destinationLabel: "Gmail Draft",
        requiresConfiguredAction: true,
      };

    case "video_script":
      return {
        provider: "galaxyai",
        channel: "galaxyai",
        actionKey: "prepare_galaxyai_media_request",
        destinationLabel: "GalaxyAI Media",
        requiresConfiguredAction: false,
      };

    case "blog_post":
      return {
        provider: "zapier",
        channel: "wordpress",
        actionKey: envValue(
          "ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY",
          "WORDPRESS_CREATE_POST_ACTION_KEY",
          "ZAPIER_WORDPRESS_POST_ACTION_KEY",
          "NEXT_PUBLIC_ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY"
        ),
        destinationLabel: "WordPress Draft",
        requiresConfiguredAction: true,
      };

    default:
      return null;
  }
}

export function getZapierAppForChannel(channel: PublishingRoute["channel"]) {
  switch (channel) {
    case "linkedin":
      return "linkedin";
    case "facebook":
      return "facebook";
    case "gmail":
      return "gmail";
    case "wordpress":
      return "wordpress";
    default:
      return "zapier";
  }
}

function cleanContent(content: string | null | undefined) {
  return String(content ?? "").trim();
}

function titleForAsset(asset: Record<string, any>) {
  return String(asset.title ?? "Untitled VIP Asset").trim();
}

function stripInternalTraceLines(content: string) {
  return content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();

      if (/^Quality resubmission based on review:/i.test(trimmed)) return false;
      if (/^Original asset ID:/i.test(trimmed)) return false;
      if (/^Source asset:/i.test(trimmed)) return false;
      if (/^Source asset ID:/i.test(trimmed)) return false;

      return true;
    })
    .join("\n")
    .trim();
}

export function buildPublishingInstructions({
  asset,
  route,
  recipientEmail,
}: {
  asset: Record<string, any>;
  route: PublishingRoute;
  recipientEmail?: string;
}) {
  const title = titleForAsset(asset);
  const content = stripInternalTraceLines(cleanContent(asset.content));

  if (route.channel === "wordpress") {
    const postStatus = process.env.WORDPRESS_DEFAULT_POST_STATUS?.trim() || "draft";

    return [
      `Create a WordPress ${postStatus} for this approved VIP blog post.`,
      "",
      `Title: ${title}`,
      "",
      "Post content:",
      content,
      "",
      "Important:",
      "- Preserve headings and paragraphs.",
      "- Do not publish automatically unless the post_status parameter is explicitly publish.",
      "- Return the WordPress post ID, edit URL, public URL if available, and status.",
    ].join("\n");
  }

  if (route.channel === "gmail") {
    return [
      "Create a Gmail draft for this approved VIP asset.",
      recipientEmail ? `Recipient: ${recipientEmail}` : "Recipient: use the provided recipient_email parameter.",
      `Subject: ${title}`,
      "",
      "Email body:",
      content,
      "",
      "Return the Gmail draft ID and useful draft details.",
    ].join("\n");
  }

  if (route.channel === "linkedin") {
    return [
      "Create or prepare a LinkedIn post for this approved VIP asset.",
      "",
      `Post title/context: ${title}`,
      "",
      content,
      "",
      "Return the created post/draft ID, URL if available, and status.",
    ].join("\n");
  }

  if (route.channel === "facebook") {
    return [
      "Create or prepare a Facebook post for this approved VIP asset.",
      "",
      `Post title/context: ${title}`,
      "",
      content,
      "",
      "Return the created post/draft ID, URL if available, and status.",
    ].join("\n");
  }

  if (route.channel === "galaxyai") {
    return [
      "Prepare a GalaxyAI media request for this approved VIP video script.",
      "",
      `Title: ${title}`,
      "",
      content,
    ].join("\n");
  }

  return [
    `Execute approved VIP asset for ${route.destinationLabel}.`,
    "",
    `Title: ${title}`,
    "",
    content,
  ].join("\n");
}

export function buildPublishingParams({
  asset,
  route,
  recipientEmail,
}: {
  asset: Record<string, any>;
  route: PublishingRoute;
  recipientEmail?: string;
}) {
  const title = titleForAsset(asset);
  const content = stripInternalTraceLines(cleanContent(asset.content));
  const scheduledPublishAt = asset.scheduled_publish_at ?? null;
  const postStatus = process.env.WORDPRESS_DEFAULT_POST_STATUS?.trim() || "draft";

  if (route.channel === "wordpress") {
    return {
      title,
      content,
      status: postStatus,
      post_status: postStatus,
      type: "post",
      scheduled_publish_at: scheduledPublishAt,
      publish_timezone: asset.publish_timezone ?? "America/Chicago",
      asset_id: asset.id,
      asset_type: asset.asset_type,
      source: "VIP",
    };
  }

  if (route.channel === "gmail") {
    return {
      to: recipientEmail ?? "",
      recipient_email: recipientEmail ?? "",
      subject: title,
      body: content,
      asset_id: asset.id,
      asset_type: asset.asset_type,
      scheduled_publish_at: scheduledPublishAt,
    };
  }

  if (route.channel === "linkedin" || route.channel === "facebook") {
    return {
      message: content,
      text: content,
      title,
      asset_id: asset.id,
      asset_type: asset.asset_type,
      scheduled_publish_at: scheduledPublishAt,
    };
  }

  return {
    title,
    content,
    asset_id: asset.id,
    asset_type: asset.asset_type,
    scheduled_publish_at: scheduledPublishAt,
  };
}
