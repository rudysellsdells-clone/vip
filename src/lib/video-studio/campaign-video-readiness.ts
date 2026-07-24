import type { UnifiedVideoRun } from "./provider-registry";
import type {
  VideoProvider,
  VideoRenderStatus,
  VideoReviewStatus,
} from "./video-package";

export type CampaignVideoPackageState = {
  provider: VideoProvider;
  assetStatus: string | null;
  renderStatus: VideoRenderStatus | null;
};

export type CampaignVideoReadiness = {
  packageCount: number;
  lumaPackageCount: number;
  magicaPackageCount: number;
  needsReviewCount: number;
  approvedCount: number;
  readyToRenderCount: number;
  activeRenderCount: number;
  completedRenderCount: number;
  failedRenderCount: number;
  status:
    | "not_started"
    | "needs_review"
    | "ready_to_render"
    | "rendering"
    | "attention"
    | "completed";
  nextAction: {
    label: string;
    description: string;
    href: string;
  };
};

export type VideoUsageSummary = {
  totalAttempts: number;
  lumaAttempts: number;
  magicaAttempts: number;
  activeAttempts: number;
  completedAttempts: number;
  failedAttempts: number;
};

export function videoReviewStatusFromAssetStatus(
  status: unknown,
): VideoReviewStatus {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (["approved", "published", "sent"].includes(normalized)) return "approved";
  if (["rejected", "revision_requested", "needs_revision"].includes(normalized)) {
    return "revision_requested";
  }
  if (["archived", "inactive"].includes(normalized)) return "archived";
  if (["needs_review", "pending_review", "draft"].includes(normalized)) {
    return "needs_review";
  }

  return "not_submitted";
}

export function buildVideoUsageSummary(
  runs: UnifiedVideoRun[],
): VideoUsageSummary {
  return {
    totalAttempts: runs.length,
    lumaAttempts: runs.filter((run) => run.provider === "luma").length,
    magicaAttempts: runs.filter((run) => run.provider === "magica").length,
    activeAttempts: runs.filter((run) =>
      ["queued", "rendering"].includes(run.renderStatus),
    ).length,
    completedAttempts: runs.filter((run) => run.renderStatus === "completed").length,
    failedAttempts: runs.filter((run) => run.renderStatus === "failed").length,
  };
}

export function buildCampaignVideoReadiness(
  packages: CampaignVideoPackageState[],
): CampaignVideoReadiness {
  const packageCount = packages.length;
  const lumaPackageCount = packages.filter(
    (item) => item.provider === "luma",
  ).length;
  const magicaPackageCount = packages.filter(
    (item) => item.provider === "magica",
  ).length;
  const needsReviewCount = packages.filter((item) => {
    const review = videoReviewStatusFromAssetStatus(item.assetStatus);
    return review === "needs_review" || review === "revision_requested";
  }).length;
  const approvedCount = packages.filter(
    (item) => videoReviewStatusFromAssetStatus(item.assetStatus) === "approved",
  ).length;
  const readyToRenderCount = packages.filter(
    (item) =>
      videoReviewStatusFromAssetStatus(item.assetStatus) === "approved" &&
      (!item.renderStatus || item.renderStatus === "draft"),
  ).length;
  const activeRenderCount = packages.filter((item) =>
    item.renderStatus
      ? ["queued", "rendering"].includes(item.renderStatus)
      : false,
  ).length;
  const completedRenderCount = packages.filter(
    (item) => item.renderStatus === "completed",
  ).length;
  const failedRenderCount = packages.filter(
    (item) => item.renderStatus === "failed",
  ).length;

  let status: CampaignVideoReadiness["status"] = "completed";
  let nextAction: CampaignVideoReadiness["nextAction"];

  if (!packageCount) {
    status = "not_started";
    nextAction = {
      label: "Create Video Package",
      description:
        "Turn this approved campaign or one of its approved ad packages into a provider-ready video concept.",
      href: "/video-studio",
    };
  } else if (needsReviewCount) {
    status = "needs_review";
    nextAction = {
      label: "Review Video Packages",
      description: `${needsReviewCount} video package${
        needsReviewCount === 1 ? " needs" : "s need"
      } approval or revision before rendering.`,
      href: "/approvals",
    };
  } else if (failedRenderCount) {
    status = "attention";
    nextAction = {
      label: "Resolve Failed Renders",
      description: `${failedRenderCount} provider render${
        failedRenderCount === 1 ? " needs" : "s need"
      } attention before the campaign video lane is complete.`,
      href: "/video-studio",
    };
  } else if (activeRenderCount) {
    status = "rendering";
    nextAction = {
      label: "Monitor Video Renders",
      description: `${activeRenderCount} provider render${
        activeRenderCount === 1 ? " is" : "s are"
      } currently queued or rendering.`,
      href: "/video-studio",
    };
  } else if (readyToRenderCount) {
    status = "ready_to_render";
    nextAction = {
      label: "Start Approved Renders",
      description: `${readyToRenderCount} approved video package${
        readyToRenderCount === 1 ? " is" : "s are"
      } ready for Luma or Magica execution.`,
      href: "/video-studio",
    };
  } else {
    status = "completed";
    nextAction = {
      label: "Review Completed Video",
      description: `${completedRenderCount} completed render${
        completedRenderCount === 1 ? " is" : "s are"
      } connected to this campaign.`,
      href: "/video-studio",
    };
  }

  return {
    packageCount,
    lumaPackageCount,
    magicaPackageCount,
    needsReviewCount,
    approvedCount,
    readyToRenderCount,
    activeRenderCount,
    completedRenderCount,
    failedRenderCount,
    status,
    nextAction,
  };
}
