export type WeeklyAssetBlueprint = {
  assetType:
    | "blog_post"
    | "linkedin_post"
    | "facebook_post"
    | "email"
    | "video_script"
    | "galaxyai_prompt";
  dayOffset: number;
  hour: number;
  minute: number;
  sortOrder: number;
  label: string;
};

export const WEEKLY_CAMPAIGN_ASSET_BLUEPRINT: WeeklyAssetBlueprint[] = [
  {
    assetType: "linkedin_post",
    dayOffset: 0,
    hour: 9,
    minute: 15,
    sortOrder: 10,
    label: "Monday LinkedIn post",
  },
  {
    assetType: "facebook_post",
    dayOffset: 0,
    hour: 11,
    minute: 0,
    sortOrder: 20,
    label: "Monday Facebook post",
  },
  {
    assetType: "blog_post",
    dayOffset: 1,
    hour: 9,
    minute: 0,
    sortOrder: 30,
    label: "Tuesday blog post",
  },
  {
    assetType: "linkedin_post",
    dayOffset: 1,
    hour: 13,
    minute: 30,
    sortOrder: 40,
    label: "Tuesday LinkedIn post",
  },
  {
    assetType: "facebook_post",
    dayOffset: 1,
    hour: 15,
    minute: 0,
    sortOrder: 50,
    label: "Tuesday Facebook post",
  },
  {
    assetType: "linkedin_post",
    dayOffset: 2,
    hour: 9,
    minute: 15,
    sortOrder: 60,
    label: "Wednesday LinkedIn post",
  },
  {
    assetType: "facebook_post",
    dayOffset: 2,
    hour: 11,
    minute: 0,
    sortOrder: 70,
    label: "Wednesday Facebook post",
  },
  {
    assetType: "email",
    dayOffset: 3,
    hour: 9,
    minute: 15,
    sortOrder: 80,
    label: "Thursday email",
  },
  {
    assetType: "linkedin_post",
    dayOffset: 3,
    hour: 13,
    minute: 30,
    sortOrder: 90,
    label: "Thursday LinkedIn post",
  },
  {
    assetType: "facebook_post",
    dayOffset: 3,
    hour: 15,
    minute: 0,
    sortOrder: 100,
    label: "Thursday Facebook post",
  },
  {
    assetType: "video_script",
    dayOffset: 4,
    hour: 10,
    minute: 30,
    sortOrder: 110,
    label: "Friday video script",
  },
  {
    assetType: "galaxyai_prompt",
    dayOffset: 4,
    hour: 10,
    minute: 45,
    sortOrder: 115,
    label: "Friday GalaxyAI video prompt",
  },
  {
    assetType: "linkedin_post",
    dayOffset: 4,
    hour: 13,
    minute: 0,
    sortOrder: 120,
    label: "Friday LinkedIn post",
  },
  {
    assetType: "facebook_post",
    dayOffset: 4,
    hour: 14,
    minute: 30,
    sortOrder: 130,
    label: "Friday Facebook post",
  },
];

export function assetTypeLabel(assetType: string) {
  return assetType.replaceAll("_", " ");
}

export function expectedWeeklyAssetCount() {
  return WEEKLY_CAMPAIGN_ASSET_BLUEPRINT.length;
}
