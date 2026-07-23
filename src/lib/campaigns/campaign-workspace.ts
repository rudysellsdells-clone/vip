export type CampaignWorkspaceStageId =
  | "brief"
  | "strategy"
  | "assets"
  | "review"
  | "execution";

export type CampaignWorkspaceStageStatus =
  | "complete"
  | "current"
  | "locked"
  | "attention";

export type CampaignWorkspaceStage = {
  id: CampaignWorkspaceStageId;
  label: string;
  description: string;
  href: string;
  status: CampaignWorkspaceStageStatus;
};

export type CampaignWorkspaceState = {
  stages: CampaignWorkspaceStage[];
  completedStageCount: number;
  progressPercent: number;
  nextAction: {
    label: string;
    description: string;
    href: string;
  };
};

export type CampaignWorkspaceInput = {
  strategyApproved: boolean;
  strategyStale: boolean;
  assetCount: number;
  needsReviewCount: number;
  approvedAssetCount: number;
  executedAssetCount: number;
};

export function buildCampaignWorkspaceState({
  strategyApproved,
  strategyStale,
  assetCount,
  needsReviewCount,
  approvedAssetCount,
  executedAssetCount,
}: CampaignWorkspaceInput): CampaignWorkspaceState {
  const reviewComplete = assetCount > 0 && needsReviewCount === 0;
  const executionAvailable = approvedAssetCount > 0 || executedAssetCount > 0;
  const executionComplete = executedAssetCount > 0 && approvedAssetCount === 0;

  const stages: CampaignWorkspaceStage[] = [
    {
      id: "brief",
      label: "Brief",
      description: "Audience, offer, goal, channels, and campaign inputs.",
      href: "#brief",
      status: "complete",
    },
    {
      id: "strategy",
      label: "Strategy",
      description: "Generate, review, and approve the Marketing Spine.",
      href: "#strategy",
      status: strategyStale
        ? "attention"
        : strategyApproved
          ? "complete"
          : "current",
    },
    {
      id: "assets",
      label: "Assets",
      description: "Generate the campaign asset pack and video outputs.",
      href: "#assets",
      status: !strategyApproved
        ? "locked"
        : assetCount > 0
          ? "complete"
          : "current",
    },
    {
      id: "review",
      label: "Review",
      description: "Approve, revise, or reject generated campaign assets.",
      href: "#assets",
      status:
        assetCount === 0
          ? "locked"
          : reviewComplete
            ? "complete"
            : "current",
    },
    {
      id: "execution",
      label: "Execution",
      description: "Publish, send, export, or otherwise activate approved work.",
      href: "#execution",
      status: !reviewComplete || !executionAvailable
        ? "locked"
        : executionComplete
          ? "complete"
          : "current",
    },
  ];

  const completedStageCount = stages.filter(
    (stage) => stage.status === "complete",
  ).length;

  let nextAction: CampaignWorkspaceState["nextAction"];

  if (strategyStale) {
    nextAction = {
      label: "Refresh Marketing Spine",
      description:
        "The campaign inputs or approved intelligence changed after strategy approval.",
      href: "#strategy",
    };
  } else if (!strategyApproved) {
    nextAction = {
      label: "Approve Marketing Spine",
      description:
        "Review the campaign-specific strategy before generating public-facing assets.",
      href: "#strategy",
    };
  } else if (assetCount === 0) {
    nextAction = {
      label: "Generate Asset Pack",
      description:
        "The approved strategy is ready to guide content and visual generation.",
      href: "#strategy",
    };
  } else if (needsReviewCount > 0) {
    nextAction = {
      label: "Review Generated Assets",
      description: `${needsReviewCount} asset${needsReviewCount === 1 ? "" : "s"} still need approval or revision.`,
      href: "#assets",
    };
  } else if (approvedAssetCount > 0) {
    nextAction = {
      label: "Execute Approved Assets",
      description: `${approvedAssetCount} approved asset${approvedAssetCount === 1 ? " is" : "s are"} ready for activation.`,
      href: "#execution",
    };
  } else {
    nextAction = {
      label: "Review Campaign Status",
      description:
        "The current workflow is complete. Review delivery status and campaign performance next.",
      href: "#execution",
    };
  }

  return {
    stages,
    completedStageCount,
    progressPercent: Math.round((completedStageCount / stages.length) * 100),
    nextAction,
  };
}
