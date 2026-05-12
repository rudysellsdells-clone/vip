export type ExternalActionRisk = "low" | "medium" | "high";

export type ExternalAction = {
  provider: "galaxyai" | "zapier_mcp" | "internal_ai" | "manual";
  actionName: string;
  risk: ExternalActionRisk;
};

export function requiresExplicitApproval(action: ExternalAction): boolean {
  if (action.risk === "high") return true;

  const highRiskActionWords = [
    "send",
    "publish",
    "delete",
    "spend",
    "launch",
    "modify_live",
    "contact_prospect",
    "contact_client"
  ];

  return highRiskActionWords.some((word) =>
    action.actionName.toLowerCase().includes(word)
  );
}

export function assertApprovedOrThrow(isApproved: boolean, actionName: string) {
  if (!isApproved) {
    throw new Error(`Approval required before action can run: ${actionName}`);
  }
}
