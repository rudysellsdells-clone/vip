export type PublishableAssetType =
  | "linkedin_post"
  | "facebook_post"
  | "email"
  | "video_script";

export type PublishingRoute = {
  provider: "zapier_mcp" | "galaxyai" | "manual";
  channel: "linkedin" | "facebook" | "gmail" | "galaxyai";
  actionKey: string;
  destinationLabel: string;
  requiresConfiguredAction: boolean;
};

export const PUBLISHABLE_ASSET_TYPES = [
  "linkedin_post",
  "facebook_post",
  "email",
  "video_script",
];

function env(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

export function getPublishingRoute(assetType: string): PublishingRoute | null {
  switch (assetType) {
    case "linkedin_post":
      return {
        provider: "zapier_mcp",
        channel: "linkedin",
        actionKey: env("ZAPIER_LINKEDIN_CREATE_POST_ACTION"),
        destinationLabel: "LinkedIn",
        requiresConfiguredAction: true,
      };

    case "facebook_post":
      return {
        provider: "zapier_mcp",
        channel: "facebook",
        actionKey: env("ZAPIER_FACEBOOK_CREATE_POST_ACTION"),
        destinationLabel: "Facebook",
        requiresConfiguredAction: true,
      };

    case "email":
      return {
        provider: "zapier_mcp",
        channel: "gmail",
        actionKey: env("ZAPIER_GMAIL_CREATE_DRAFT_ACTION", "draft_v2"),
        destinationLabel: "Gmail Draft",
        requiresConfiguredAction: false,
      };

    case "video_script":
      return {
        provider: "galaxyai",
        channel: "galaxyai",
        actionKey: env("GALAXYAI_MEDIA_REQUEST_ACTION", "manual_media_request"),
        destinationLabel: "GalaxyAI Media Request",
        requiresConfiguredAction: false,
      };

    default:
      return null;
  }
}

export function getZapierAppForChannel(channel: PublishingRoute["channel"]) {
  switch (channel) {
    case "linkedin":
      return env("ZAPIER_LINKEDIN_APP", "linkedin");
    case "facebook":
      return env("ZAPIER_FACEBOOK_APP", "facebook_pages");
    case "gmail":
      return env("ZAPIER_GMAIL_APP", "gmail");
    default:
      return "";
  }
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
  const title = asset.title ?? "Approved VIP asset";
  const content = asset.content ?? "";

  if (route.channel === "gmail") {
    return [
      "Create a Gmail draft. Do not send the email.",
      recipientEmail ? `To: ${recipientEmail}` : "Recipient was not provided. Create the draft if the action supports no recipient; otherwise return a useful error.",
      `Subject: ${title}`,
      "",
      "Body:",
      content,
      "",
      "Important: Create a draft only. Do not send.",
    ].join("\n");
  }

  if (route.channel === "linkedin") {
    return [
      "Create or prepare a LinkedIn company/page post using the approved content below.",
      "Do not publish if the enabled action supports draft/review mode; otherwise execute according to the configured Zapier action.",
      "",
      `Title/reference: ${title}`,
      "",
      "Post content:",
      content,
    ].join("\n");
  }

  if (route.channel === "facebook") {
    return [
      "Create or prepare a Facebook Page post using the approved content below.",
      "Do not publish if the enabled action supports draft/review mode; otherwise execute according to the configured Zapier action.",
      "",
      `Title/reference: ${title}`,
      "",
      "Post content:",
      content,
    ].join("\n");
  }

  return [
    "Prepare a GalaxyAI media request from this approved video script/prompt.",
    "Use the content as the creative direction for media generation.",
    "",
    `Title/reference: ${title}`,
    "",
    "Video prompt/script:",
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
  const title = asset.title ?? "Approved VIP asset";
  const content = asset.content ?? "";

  if (route.channel === "gmail") {
    return {
      to: recipientEmail || undefined,
      to_email: recipientEmail || undefined,
      email: recipientEmail || undefined,
      subject: title,
      body: content,
      message: content,
    };
  }

  if (route.channel === "linkedin") {
    return {
      text: content,
      post: content,
      body: content,
      message: content,
      title,
    };
  }

  if (route.channel === "facebook") {
    return {
      message: content,
      text: content,
      post: content,
      body: content,
      title,
    };
  }

  return {
    title,
    prompt: content,
    script: content,
    source_asset_id: asset.id,
  };
}
