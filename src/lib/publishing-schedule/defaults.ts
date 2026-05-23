export const DEFAULT_PUBLISH_TIMEZONE = "America/Chicago";

export const SCHEDULABLE_ASSET_TYPES = [
  "blog_post",
  "white_paper",
  "authority_asset",
  "prospect_what_if_story",
  "linkedin_post",
  "facebook_post",
  "email",
  "video_script",
];

export type ScheduleSlot = {
  assetType: string;
  dayOffset: number;
  hour: number;
  minute: number;
  label: string;
};

export const WEEKLY_PUBLISHING_CADENCE: ScheduleSlot[] = [
  {
    assetType: "blog_post",
    dayOffset: 1,
    hour: 9,
    minute: 0,
    label: "Tuesday morning blog/content anchor",
  },
  {
    assetType: "linkedin_post",
    dayOffset: 1,
    hour: 13,
    minute: 30,
    label: "Tuesday afternoon LinkedIn post",
  },
  {
    assetType: "facebook_post",
    dayOffset: 2,
    hour: 11,
    minute: 0,
    label: "Wednesday Facebook post",
  },
  {
    assetType: "email",
    dayOffset: 3,
    hour: 9,
    minute: 15,
    label: "Thursday email/outreach",
  },
  {
    assetType: "video_script",
    dayOffset: 4,
    hour: 10,
    minute: 30,
    label: "Friday video/media prompt",
  },
  {
    assetType: "white_paper",
    dayOffset: 2,
    hour: 10,
    minute: 0,
    label: "Wednesday authority/lead magnet",
  },
  {
    assetType: "authority_asset",
    dayOffset: 2,
    hour: 14,
    minute: 0,
    label: "Wednesday authority asset",
  },
  {
    assetType: "prospect_what_if_story",
    dayOffset: 3,
    hour: 14,
    minute: 30,
    label: "Thursday prospect What-If outreach",
  },
];

export function channelLabel(assetType: string | null | undefined) {
  switch (assetType) {
    case "blog_post":
      return "Blog";
    case "white_paper":
      return "White Paper";
    case "authority_asset":
      return "Authority Asset";
    case "prospect_what_if_story":
      return "What-If Outreach";
    case "linkedin_post":
      return "LinkedIn";
    case "facebook_post":
      return "Facebook";
    case "email":
      return "Email";
    case "video_script":
      return "Video";
    default:
      return "Manual";
  }
}
