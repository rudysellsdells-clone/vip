import { PUBLISHABLE_ASSET_TYPES } from "@/lib/publishing/asset-routing";

export const MANUAL_PUBLISHING_READY_ASSET_TYPES = [
  "blog_post",
  "white_paper",
  "authority_asset",
  "prospect_what_if_story",
];

export const PUBLISHING_READY_VISIBLE_ASSET_TYPES = Array.from(
  new Set([...PUBLISHABLE_ASSET_TYPES, ...MANUAL_PUBLISHING_READY_ASSET_TYPES])
);

export function isManualPublishingAssetType(assetType: string | null | undefined) {
  return MANUAL_PUBLISHING_READY_ASSET_TYPES.includes(String(assetType ?? ""));
}

export function manualPublishingLabel(assetType: string | null | undefined) {
  switch (assetType) {
    case "blog_post":
      return "Website / Blog";
    case "white_paper":
      return "Lead Magnet / Sales Enablement";
    case "authority_asset":
      return "Authority Library";
    case "prospect_what_if_story":
      return "Prospect Outreach";
    default:
      return "Manual Publishing";
  }
}

export function manualPublishingNextStep(assetType: string | null | undefined) {
  switch (assetType) {
    case "blog_post":
      return "Publish this manually to the website/blog, then mark it published.";
    case "white_paper":
      return "Upload or attach this to the correct lead magnet/sales enablement workflow, then mark it published.";
    case "authority_asset":
      return "Add this to the authority content library or website resource area, then mark it published.";
    case "prospect_what_if_story":
      return "Use the What-If PDF/Gmail tools for prospect outreach, then mark it published/sent.";
    default:
      return "Complete the manual publishing step, then mark it published.";
  }
}
