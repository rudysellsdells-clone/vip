import { getZapierPolicy } from "./action-policy";

export type AssetForZapierPlan = {
  id: string;
  campaign_id: string | null;
  asset_type: string;
  title: string | null;
  content: string;
  status: string;
};

export type ZapierPreparedAction = {
  policyKey: string;
  app: string;
  action: string;
  actionName: string;
  instructions: string;
  output: string;
  params: Record<string, unknown>;
  approvalRequired: boolean;
  riskLevel: string;
  notes: string;
};

function policyKeyForAssetType(assetType: string) {
  switch (assetType) {
    case "email":
      return "gmail_draft_v2";
    case "linkedin_post":
      return "linkedin_share";
    case "facebook_post":
      return "facebook_pages_page_stream";
    case "youtube_title":
    case "youtube_description":
      return "youtube_upload_video";
    case "video_script":
    case "synthesia_script":
      return "synthesia_create_video";
    default:
      return "manual_review";
  }
}

function buildParams(asset: AssetForZapierPlan, app: string) {
  if (app === "Gmail") {
    return {
      subject: asset.title ?? "Draft from Rudy's Marketing Twin",
      body: asset.content,
    };
  }

  if (app === "LinkedIn") {
    return {
      commentary: asset.content,
    };
  }

  if (app === "Facebook Pages") {
    return {
      message: asset.content,
    };
  }

  if (app === "YouTube") {
    return {
      title: asset.asset_type === "youtube_title" ? asset.content : asset.title,
      description:
        asset.asset_type === "youtube_description" ? asset.content : asset.content,
      note: "Prepared metadata only. Actual upload requires a video file and explicit approval.",
    };
  }

  if (app === "Synthesia") {
    return {
      script: asset.content,
      title: asset.title ?? "Video from Rudy's Marketing Twin",
    };
  }

  return {
    content: asset.content,
  };
}

export function buildZapierPreparedAction(asset: AssetForZapierPlan) {
  const policyKey = policyKeyForAssetType(asset.asset_type);
  const policy = getZapierPolicy(policyKey);

  const params = buildParams(asset, policy.app);

  const instructions = [
    `Prepare a ${policy.actionName} action in ${policy.app} from the approved VIP asset.`,
    "Do not send, publish, upload, or execute externally unless Rudy explicitly approves.",
    `Asset title: ${asset.title ?? "Untitled asset"}`,
    `Asset type: ${asset.asset_type}`,
  ].join("\n");

  const output = [
    "Return the prepared action details, including target app, action, title/subject/message/script fields, and any missing information needed before execution.",
    "Do not execute the action automatically.",
  ].join(" ");

  return {
    policyKey,
    app: policy.app,
    action: policy.action,
    actionName: policy.actionName,
    instructions,
    output,
    params,
    approvalRequired: policy.approvalRequired,
    riskLevel: policy.riskLevel,
    notes: policy.notes,
  } satisfies ZapierPreparedAction;
}
