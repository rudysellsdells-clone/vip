import type { GalaxyMediaAttachment } from "@/lib/galaxyai/media";
import {
  buildNativeUploadInstruction,
  getPrimaryImage,
  getPrimaryVideo,
} from "@/lib/galaxyai/media";

export const FACEBOOK_APP_NAME = "Facebook Pages";

export const FACEBOOK_TEXT_POLICY_KEY = "facebook_pages_page_stream";
export const FACEBOOK_PHOTO_POLICY_KEY = "facebook_pages_page_photo";
export const FACEBOOK_VIDEO_POLICY_KEY = "facebook_pages_page_video";

export const FACEBOOK_TEXT_ACTION_NAME = "page_stream";
export const FACEBOOK_PHOTO_ACTION_NAME = "page_photo";
export const FACEBOOK_VIDEO_ACTION_NAME = "page_video";

export function getFacebookPageName() {
  return (
    process.env.ZAPIER_FACEBOOK_PAGE_NAME?.trim() ||
    process.env.FACEBOOK_PAGE_NAME?.trim() ||
    "mccormick.web.marketing"
  );
}

export function getFacebookPageId() {
  return (
    process.env.ZAPIER_FACEBOOK_PAGE_ID?.trim() ||
    process.env.FACEBOOK_PAGE_ID?.trim() ||
    null
  );
}

export function getFacebookMcpToolName() {
  return process.env.ZAPIER_FACEBOOK_MCP_TOOL_NAME?.trim() || "execute_zapier_write_action";
}

export function isFacebookAsset(assetType: string | null | undefined, title?: string | null) {
  const haystack = `${assetType ?? ""} ${title ?? ""}`.toLowerCase();

  return haystack.includes("facebook") || haystack.includes("fb");
}

function chooseFacebookMedia(mediaAttachments: GalaxyMediaAttachment[]) {
  const image = getPrimaryImage(mediaAttachments);
  const video = getPrimaryVideo(mediaAttachments);

  // Prefer image first because Facebook page_photo can take up to 10 images
  // and tends to be more reliable for campaign creative. If no image exists,
  // use video.
  return image ?? video ?? null;
}

function getFacebookRoute(mediaAttachments: GalaxyMediaAttachment[]) {
  const media = chooseFacebookMedia(mediaAttachments);

  if (media?.type === "image") {
    return {
      media,
      policyKey: FACEBOOK_PHOTO_POLICY_KEY,
      action: FACEBOOK_PHOTO_ACTION_NAME,
      actionLabel: "Facebook page photo",
      uploadMode: "native_photo_upload",
      mediaField: "source",
      captionField: "message",
    };
  }

  if (media?.type === "video") {
    return {
      media,
      policyKey: FACEBOOK_VIDEO_POLICY_KEY,
      action: FACEBOOK_VIDEO_ACTION_NAME,
      actionLabel: "Facebook page video",
      uploadMode: "native_video_upload",
      mediaField: "source",
      captionField: "description",
    };
  }

  return {
    media: null,
    policyKey: FACEBOOK_TEXT_POLICY_KEY,
    action: FACEBOOK_TEXT_ACTION_NAME,
    actionLabel: "Facebook page post",
    uploadMode: "text_only",
    mediaField: null,
    captionField: "message",
  };
}

export function buildFacebookMcpInput({
  assetId,
  campaignId,
  assetTitle,
  content,
  mediaAttachments = [],
}: {
  assetId: string;
  campaignId: string | null;
  assetTitle: string | null;
  content: string;
  mediaAttachments?: GalaxyMediaAttachment[];
}) {
  const pageName = getFacebookPageName();
  const pageId = getFacebookPageId();
  const route = getFacebookRoute(mediaAttachments);

  const nativeUploadInstruction =
    route.media && route.mediaField
      ? buildNativeUploadInstruction({
          platform: "Facebook",
          action: route.action,
          media: route.media,
          captionField: route.captionField,
          mediaField: route.mediaField,
        })
      : "";

  const pageValue = pageId ?? pageName;

  const params =
    route.action === FACEBOOK_PHOTO_ACTION_NAME
      ? {
          page: pageValue,
          source: route.media ? [route.media.url] : [],
          message: content,
        }
      : route.action === FACEBOOK_VIDEO_ACTION_NAME
        ? {
            page: pageValue,
            title: assetTitle ?? "Campaign video",
            source: route.media?.url ?? "",
            description: content,
          }
        : {
            page: pageValue,
            message: content,
          };

  return {
    policyKey: route.policyKey,
    app: FACEBOOK_APP_NAME,
    action: route.action,
    actionLabel: route.actionLabel,
    mcpToolName: getFacebookMcpToolName(),
    assetId,
    campaignId,
    assetTitle,
    pageName,
    pageId,
    mediaUploadMode: route.uploadMode,
    primaryMediaUrl: route.media?.url ?? null,
    primaryMediaType: route.media?.type ?? null,
    mediaAttachments,
    instructions: [
      route.media
        ? `Upload the GalaxyAI ${route.media.type} as native Facebook media using the Zapier ${route.action} action.`
        : "Publish this exact approved content as a Facebook Page post.",
      "Target only the configured Facebook Page. Do not publish to a personal profile.",
      nativeUploadInstruction,
    ]
      .filter(Boolean)
      .join("\n\n"),
    params,
  };
}
