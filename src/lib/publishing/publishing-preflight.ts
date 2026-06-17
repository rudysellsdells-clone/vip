import type { AccountPublishingSettings } from "@/lib/accounts/account-publishing-settings";
import type { PublishingAsset, ZapierMcpAssetConfig } from "@/lib/publishing/output-payload";

export type PublishingPreflightReport = {
  ready: boolean;
  destinationLabel: string;
  accountSettingsFound: boolean;
  blockers: string[];
  warnings: string[];
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function assetType(asset: PublishingAsset) {
  return text(asset.asset_type).toLowerCase();
}

export function publishingDestinationLabel(asset: PublishingAsset, config: ZapierMcpAssetConfig) {
  const type = assetType(asset);

  if (type === "linkedin_post") {
    return config.pageName || config.pageId
      ? `LinkedIn: ${config.pageName || config.pageId}`
      : "LinkedIn destination missing";
  }

  if (type === "facebook_post") {
    return config.pageName || config.pageId
      ? `Facebook: ${config.pageName || config.pageId}`
      : "Facebook destination missing";
  }

  if (type === "blog_post") return "WordPress draft/post destination";
  if (type === "email") return "Gmail draft destination";
  if (type.includes("galaxyai")) return "GalaxyAI visual prompt destination";

  return config.app || "Publishing destination";
}

export function buildPublishingPreflightReport({
  asset,
  config,
  settings,
  canManage,
}: {
  asset: PublishingAsset;
  config: ZapierMcpAssetConfig;
  settings: AccountPublishingSettings | null;
  canManage: boolean;
}): PublishingPreflightReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const type = assetType(asset);

  if (!canManage) {
    blockers.push("Your current role can preview this asset, but cannot execute publishing actions for this workspace.");
  }

  if (!settings) {
    blockers.push("This workspace does not have account publishing settings saved yet.");
  }

  if (!config.app) {
    blockers.push("ZapierMCP app is not configured for this asset type.");
  }

  if (!config.action) {
    blockers.push("ZapierMCP action is not configured for this asset type.");
  }

  if (type === "linkedin_post") {
    if (!config.pageId) blockers.push("LinkedIn company/page ID is missing for this workspace.");
    if (!config.pageName) warnings.push("LinkedIn page name is missing. The ID is the real safety lock, but the label helps human review.");
  }

  if (type === "facebook_post") {
    if (!config.pageId) blockers.push("Facebook page ID is missing for this workspace.");
    if (!config.pageName) warnings.push("Facebook page name is missing. The ID is the real safety lock, but the label helps human review.");
  }

  if (type === "blog_post") {
    warnings.push("WordPress destination still resolves through the configured Zapier action. Review the payload before live execution.");
  }

  if (type === "email") {
    warnings.push("Gmail destination still resolves through the configured Zapier action. VIP creates drafts only by default.");
  }

  if (type.includes("galaxyai") && !settings?.galaxyai_style) {
    warnings.push("GalaxyAI style is not saved for this workspace yet.");
  }

  return {
    ready: blockers.length === 0,
    destinationLabel: publishingDestinationLabel(asset, config),
    accountSettingsFound: Boolean(settings),
    blockers,
    warnings,
  };
}
