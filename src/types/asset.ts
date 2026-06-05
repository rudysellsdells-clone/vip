export type AssetStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "published"
  | "sent"
  | "archived";

export type AssetType =
  | "campaign_strategy"
  | "email"
  | "linkedin_post"
  | "facebook_post"
  | "youtube_title"
  | "youtube_description"
  | "video_script"
  | "galaxyai_prompt"
  | "galaxyai_image_prompt"
  | "campaign_visual_direction"
  | "generated_social_image"
  | "synthesia_script"
  | "creative_brief";
