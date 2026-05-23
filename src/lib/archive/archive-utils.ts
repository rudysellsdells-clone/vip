export const CAMPAIGN_ASSET_TYPES = [
  "facebook_post",
  "linkedin_post",
  "email",
  "gmail_draft",
  "image_prompt",
  "image",
  "video_prompt",
  "video_script",
  "youtube_video",
  "ad_copy",
  "social_post",
  "campaign_asset",
];

export function archiveTimestamp() {
  return new Date().toISOString();
}

export function archiveReasonText(reason: string | null | undefined, fallback: string) {
  const cleaned = String(reason ?? "").trim();
  return cleaned || fallback;
}
