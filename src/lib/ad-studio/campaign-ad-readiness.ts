import type { AdPackageChannel, AdPackageStatus } from "./ad-package";

export type CampaignAdPackageState = {
  channel: AdPackageChannel;
  status: AdPackageStatus | string;
  score: number | null;
};

export type CampaignAdReadiness = {
  packageCount: number;
  searchPackageCount: number;
  paidSocialPackageCount: number;
  needsReviewCount: number;
  approvedCount: number;
  exportReadyCount: number;
  averageScore: number | null;
  channels: AdPackageChannel[];
  status: "not_started" | "needs_review" | "approved" | "active";
  nextAction: {
    label: string;
    description: string;
    href: string;
  };
};

export function buildCampaignAdReadiness(
  packages: CampaignAdPackageState[],
): CampaignAdReadiness {
  const packageCount = packages.length;
  const searchPackageCount = packages.filter(
    (item) => item.channel === "google_search",
  ).length;
  const paidSocialPackageCount = packages.filter(
    (item) => item.channel === "meta" || item.channel === "linkedin",
  ).length;
  const needsReviewCount = packages.filter(
    (item) => item.status === "needs_review" || item.status === "draft",
  ).length;
  const approvedCount = packages.filter(
    (item) => item.status === "approved",
  ).length;
  const exportReadyCount = packages.filter(
    (item) => item.status === "approved" && (item.score ?? 0) >= 75,
  ).length;
  const scoreValues = packages
    .map((item) => item.score)
    .filter((value): value is number => typeof value === "number");
  const averageScore = scoreValues.length
    ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length)
    : null;
  const channels = [...new Set(packages.map((item) => item.channel))];

  let status: CampaignAdReadiness["status"] = "active";
  let nextAction: CampaignAdReadiness["nextAction"];
  if (!packageCount) {
    status = "not_started";
    nextAction = {
      label: "Create Ad Package",
      description:
        "Build Google Search, Meta, or LinkedIn concepts from the approved campaign strategy.",
      href: "/ad-studio",
    };
  } else if (needsReviewCount) {
    status = "needs_review";
    nextAction = {
      label: "Review Ad Packages",
      description: `${needsReviewCount} ad package${needsReviewCount === 1 ? " needs" : "s need"} approval or revision.`,
      href: "/approvals",
    };
  } else if (approvedCount) {
    status = "approved";
    nextAction = {
      label: "Open Approved Ads",
      description: `${exportReadyCount} approved package${exportReadyCount === 1 ? " is" : "s are"} ready for tracked export.`,
      href: "/ad-studio",
    };
  } else {
    nextAction = {
      label: "Review Ad Status",
      description: "Review archived or previously activated advertising packages.",
      href: "/ad-studio",
    };
  }

  return {
    packageCount,
    searchPackageCount,
    paidSocialPackageCount,
    needsReviewCount,
    approvedCount,
    exportReadyCount,
    averageScore,
    channels,
    status,
    nextAction,
  };
}
