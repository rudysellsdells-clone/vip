export type MarketingAssetPack = {
  campaignStrategy: string;
  audienceAngle: string;
  coreMessage: string;
  emailDraft: string;
  linkedinPost: string;
  facebookPost: string;
  youtubeTitle: string;
  youtubeDescription: string;
  shortVideoScript: string;
  galaxyAiCreativePrompt: string;
  approvalChecklist: string;
};

export type MarketingAssetDefinition = {
  assetType: string;
  title: string;
  content: string;
};

export const MARKETING_ASSET_TYPE_LABELS: Record<keyof MarketingAssetPack, {
  assetType: string;
  title: string;
}> = {
  campaignStrategy: {
    assetType: "campaign_strategy",
    title: "Campaign Strategy",
  },
  audienceAngle: {
    assetType: "audience_angle",
    title: "Audience Angle",
  },
  coreMessage: {
    assetType: "core_message",
    title: "Core Message",
  },
  emailDraft: {
    assetType: "email",
    title: "Email Draft",
  },
  linkedinPost: {
    assetType: "linkedin_post",
    title: "LinkedIn Post",
  },
  facebookPost: {
    assetType: "facebook_post",
    title: "Facebook Post",
  },
  youtubeTitle: {
    assetType: "youtube_title",
    title: "YouTube Title",
  },
  youtubeDescription: {
    assetType: "youtube_description",
    title: "YouTube Description",
  },
  shortVideoScript: {
    assetType: "video_script",
    title: "Short Video Script",
  },
  galaxyAiCreativePrompt: {
    assetType: "galaxyai_prompt",
    title: "GalaxyAI Creative Prompt",
  },
  approvalChecklist: {
    assetType: "approval_checklist",
    title: "Approval Checklist",
  },
};

export function marketingAssetPackToAssets(
  assetPack: MarketingAssetPack
): MarketingAssetDefinition[] {
  return (Object.keys(MARKETING_ASSET_TYPE_LABELS) as Array<keyof MarketingAssetPack>)
    .map((key) => ({
      ...MARKETING_ASSET_TYPE_LABELS[key],
      content: assetPack[key],
    }))
    .filter((asset) => asset.content && asset.content.trim().length > 0);
}
