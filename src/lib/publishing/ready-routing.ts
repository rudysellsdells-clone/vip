export const READY_FOR_PUBLISHING_DECISIONS = [
  "ready_for_publishing",
  "auto_approved",
];

export const PUBLISHABLE_READY_ASSET_TYPES = [
  "linkedin_post",
  "facebook_post",
  "email",
  "video_script",
  "blog_post",
  "white_paper",
  "authority_asset",
  "prospect_what_if_story",
];

export function channelForAssetType(assetType: string | null | undefined) {
  switch (assetType) {
    case "linkedin_post":
      return "LinkedIn";
    case "facebook_post":
      return "Facebook";
    case "email":
      return "Gmail";
    case "video_script":
      return "GalaxyAI";
    case "blog_post":
      return "Website / Blog";
    case "white_paper":
      return "Lead Magnet / Sales Enablement";
    case "authority_asset":
      return "Authority Library";
    case "prospect_what_if_story":
      return "Prospect Outreach";
    default:
      return "Manual Review";
  }
}

export function nextStepForAsset({
  assetType,
  status,
}: {
  assetType: string | null | undefined;
  status: string | null | undefined;
}) {
  if (status !== "approved") {
    return "Approve asset to move it into the execution path.";
  }

  switch (assetType) {
    case "linkedin_post":
    case "facebook_post":
    case "email":
    case "video_script":
      return "Open Publishing Ready to execute or prepare the asset.";
    case "prospect_what_if_story":
      return "Use What-If PDF and Gmail tools for outreach.";
    case "blog_post":
    case "white_paper":
    case "authority_asset":
      return "Use this as source content, repurpose it, or publish manually.";
    default:
      return "Open the asset and choose the next workflow.";
  }
}

export function readyDecisionLabel(value: string | null | undefined) {
  return String(value ?? "ready").replaceAll("_", " ");
}
