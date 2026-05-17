import type { GalaxyMediaAttachment } from "@/lib/galaxyai/media";
import {
  buildNativeUploadInstruction,
  getPrimaryImage,
  getPrimaryVideo,
} from "@/lib/galaxyai/media";

export const LINKEDIN_POLICY_KEY = "linkedin_create_company_update";
export const LINKEDIN_APP_NAME = "LinkedIn";
export const LINKEDIN_ACTION_NAME = "create_company_update";

export function getLinkedInCompanyPageName() {
  return (
    process.env.ZAPIER_LINKEDIN_PAGE_NAME?.trim() ||
    process.env.LINKEDIN_COMPANY_PAGE_NAME?.trim() ||
    "McCormick Web Marketing"
  );
}

export function getLinkedInOrganizationId() {
  return (
    process.env.ZAPIER_LINKEDIN_ORGANIZATION_ID?.trim() ||
    process.env.LINKEDIN_COMPANY_PAGE_ID?.trim() ||
    null
  );
}

export function getLinkedInMcpToolName() {
  return process.env.ZAPIER_LINKEDIN_MCP_TOOL_NAME?.trim() || "execute_zapier_write_action";
}

export function isLinkedInAsset(assetType: string | null | undefined, title?: string | null) {
  const haystack = `${assetType ?? ""} ${title ?? ""}`.toLowerCase();

  return haystack.includes("linkedin") || haystack.includes("linked in");
}

export function buildLinkedInMcpInput({
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
  const pageName = getLinkedInCompanyPageName();
  const organizationId = getLinkedInOrganizationId();
  const primaryImage = getPrimaryImage(mediaAttachments);
  const primaryVideo = getPrimaryVideo(mediaAttachments);

  const nativeUploadInstruction = primaryImage
    ? buildNativeUploadInstruction({
        platform: "LinkedIn",
        action: LINKEDIN_ACTION_NAME,
        media: primaryImage,
        captionField: "comment",
        mediaField: "image",
      })
    : "";

  const videoWarning =
    !primaryImage && primaryVideo
      ? "A GalaxyAI video was found, but the enabled Zapier LinkedIn action exposes an image upload field, not a video upload field. Do not paste the video URL into the post body. Prepare this as text-only unless a LinkedIn video upload action is added."
      : "";

  return {
    policyKey: LINKEDIN_POLICY_KEY,
    app: LINKEDIN_APP_NAME,
    action: LINKEDIN_ACTION_NAME,
    mcpToolName: getLinkedInMcpToolName(),
    assetId,
    campaignId,
    assetTitle,
    pageName,
    organizationId,
    mediaUploadMode: primaryImage
      ? "native_image_upload"
      : primaryVideo
        ? "video_upload_not_available"
        : "text_only",
    primaryMediaUrl: primaryImage?.url ?? null,
    primaryMediaType: primaryImage?.type ?? null,
    unsupportedMediaUrl: !primaryImage && primaryVideo ? primaryVideo.url : null,
    unsupportedMediaType: !primaryImage && primaryVideo ? primaryVideo.type : null,
    mediaAttachments,
    instructions: [
      primaryImage
        ? "Upload the GalaxyAI image as native LinkedIn post media using the Zapier image field."
        : "Publish this exact approved content as a LinkedIn company page update.",
      "Do not publish to a personal profile. Target only the configured company page.",
      nativeUploadInstruction,
      videoWarning,
    ]
      .filter(Boolean)
      .join("\n\n"),
    params: {
      company_id: organizationId ?? pageName,
      comment: content,
      image: primaryImage?.url ?? null,
      image_type: primaryImage ? "post_media" : null,
      allow_reserved_characters: "false",
    },
  };
}
