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
  | "synthesia_script"
  | "creative_brief";
