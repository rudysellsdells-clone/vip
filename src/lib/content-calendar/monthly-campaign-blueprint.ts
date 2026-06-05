export type WeeklyAssetBlueprint = {
  assetType:
    | "campaign_visual_direction"
    | "blog_post"
    | "linkedin_post"
    | "facebook_post"
    | "email"
    | "video_script"
    | "galaxyai_prompt"
    | "galaxyai_image_prompt";
  dayOffset: number;
  hour: number;
  minute: number;
  sortOrder: number;
  label: string;
  sourceAssetType?: "linkedin_post" | "facebook_post";
  sourceSortOrder?: number;
};

export const WEEKLY_CAMPAIGN_ASSET_BLUEPRINT: WeeklyAssetBlueprint[] = [
  { assetType: "campaign_visual_direction", dayOffset: 0, hour: 8, minute: 45, sortOrder: 5, label: "Weekly campaign visual direction" },
  { assetType: "linkedin_post", dayOffset: 0, hour: 9, minute: 15, sortOrder: 10, label: "Monday LinkedIn post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 0, hour: 9, minute: 20, sortOrder: 11, label: "Monday LinkedIn image prompt", sourceAssetType: "linkedin_post", sourceSortOrder: 10 },
  { assetType: "facebook_post", dayOffset: 0, hour: 11, minute: 0, sortOrder: 20, label: "Monday Facebook post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 0, hour: 11, minute: 5, sortOrder: 21, label: "Monday Facebook image prompt", sourceAssetType: "facebook_post", sourceSortOrder: 20 },
  { assetType: "blog_post", dayOffset: 1, hour: 9, minute: 0, sortOrder: 30, label: "Tuesday blog post" },
  { assetType: "linkedin_post", dayOffset: 1, hour: 13, minute: 30, sortOrder: 40, label: "Tuesday LinkedIn post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 1, hour: 13, minute: 35, sortOrder: 41, label: "Tuesday LinkedIn image prompt", sourceAssetType: "linkedin_post", sourceSortOrder: 40 },
  { assetType: "facebook_post", dayOffset: 1, hour: 15, minute: 0, sortOrder: 50, label: "Tuesday Facebook post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 1, hour: 15, minute: 5, sortOrder: 51, label: "Tuesday Facebook image prompt", sourceAssetType: "facebook_post", sourceSortOrder: 50 },
  { assetType: "linkedin_post", dayOffset: 2, hour: 9, minute: 15, sortOrder: 60, label: "Wednesday LinkedIn post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 2, hour: 9, minute: 20, sortOrder: 61, label: "Wednesday LinkedIn image prompt", sourceAssetType: "linkedin_post", sourceSortOrder: 60 },
  { assetType: "facebook_post", dayOffset: 2, hour: 11, minute: 0, sortOrder: 70, label: "Wednesday Facebook post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 2, hour: 11, minute: 5, sortOrder: 71, label: "Wednesday Facebook image prompt", sourceAssetType: "facebook_post", sourceSortOrder: 70 },
  { assetType: "email", dayOffset: 3, hour: 9, minute: 15, sortOrder: 80, label: "Thursday email" },
  { assetType: "linkedin_post", dayOffset: 3, hour: 13, minute: 30, sortOrder: 90, label: "Thursday LinkedIn post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 3, hour: 13, minute: 35, sortOrder: 91, label: "Thursday LinkedIn image prompt", sourceAssetType: "linkedin_post", sourceSortOrder: 90 },
  { assetType: "facebook_post", dayOffset: 3, hour: 15, minute: 0, sortOrder: 100, label: "Thursday Facebook post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 3, hour: 15, minute: 5, sortOrder: 101, label: "Thursday Facebook image prompt", sourceAssetType: "facebook_post", sourceSortOrder: 100 },
  { assetType: "video_script", dayOffset: 4, hour: 10, minute: 30, sortOrder: 110, label: "Friday video script" },
  { assetType: "galaxyai_prompt", dayOffset: 4, hour: 10, minute: 45, sortOrder: 115, label: "Friday GalaxyAI video prompt" },
  { assetType: "linkedin_post", dayOffset: 4, hour: 13, minute: 0, sortOrder: 120, label: "Friday LinkedIn post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 4, hour: 13, minute: 5, sortOrder: 121, label: "Friday LinkedIn image prompt", sourceAssetType: "linkedin_post", sourceSortOrder: 120 },
  { assetType: "facebook_post", dayOffset: 4, hour: 14, minute: 30, sortOrder: 130, label: "Friday Facebook post" },
  { assetType: "galaxyai_image_prompt", dayOffset: 4, hour: 14, minute: 35, sortOrder: 131, label: "Friday Facebook image prompt", sourceAssetType: "facebook_post", sourceSortOrder: 130 },
];

export function assetTypeLabel(assetType: string) {
  return assetType.replaceAll("_", " ");
}

export function expectedWeeklyAssetCount() {
  return WEEKLY_CAMPAIGN_ASSET_BLUEPRINT.length;
}
