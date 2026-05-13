export type ZapierRiskLevel = "low" | "medium" | "high";

export type ZapierActionPolicy = {
  app: string;
  action: string;
  actionName: string;
  riskLevel: ZapierRiskLevel;
  approvalRequired: boolean;
  notes: string;
};

const HIGH_RISK_ACTION_WORDS = [
  "send",
  "publish",
  "post",
  "upload",
  "delete",
  "spend",
  "launch",
];

export function requiresZapierApproval(policy: ZapierActionPolicy) {
  if (policy.riskLevel === "high") return true;

  return HIGH_RISK_ACTION_WORDS.some((word) =>
    `${policy.app} ${policy.action} ${policy.actionName}`
      .toLowerCase()
      .includes(word)
  );
}

export const ZAPIER_ACTION_POLICIES: Record<string, ZapierActionPolicy> = {
  gmail_draft_v2: {
    app: "Gmail",
    action: "draft_v2",
    actionName: "Create Draft",
    riskLevel: "medium",
    approvalRequired: true,
    notes:
      "Creates a Gmail draft only. Rudy must review and send manually or approve sending later.",
  },
  linkedin_share: {
    app: "LinkedIn",
    action: "share",
    actionName: "Create Share Update",
    riskLevel: "high",
    approvalRequired: true,
    notes:
      "Prepares a LinkedIn share update. Do not publish without explicit approval.",
  },
  facebook_pages_page_stream: {
    app: "Facebook Pages",
    action: "page_stream",
    actionName: "Create Page Post",
    riskLevel: "high",
    approvalRequired: true,
    notes:
      "Prepares a Facebook Page post. Do not publish without explicit approval.",
  },
  youtube_upload_video: {
    app: "YouTube",
    action: "upload_video",
    actionName: "Upload Video",
    riskLevel: "high",
    approvalRequired: true,
    notes:
      "Prepares YouTube metadata for a future upload. Actual upload requires explicit approval and a video file.",
  },
  synthesia_create_video: {
    app: "Synthesia",
    action: "create_video",
    actionName: "Request New Video",
    riskLevel: "high",
    approvalRequired: true,
    notes:
      "Prepares a Synthesia video request from an approved script. Do not request video creation without explicit approval.",
  },
  manual_review: {
    app: "Manual",
    action: "review",
    actionName: "Manual Review",
    riskLevel: "low",
    approvalRequired: false,
    notes:
      "No Zapier action is mapped yet. Keep this asset in manual review.",
  },
};

export function getZapierPolicy(policyKey: string) {
  return ZAPIER_ACTION_POLICIES[policyKey] ?? ZAPIER_ACTION_POLICIES.manual_review;
}
