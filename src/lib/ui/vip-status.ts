export type VipStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

export function formatVipStatus(status: string | null | undefined) {
  if (!status) return "Unknown";

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getVipStatusTone(status: string | null | undefined): VipStatusTone {
  switch (status) {
    case "approved":
    case "completed":
    case "won":
    case "customer":
    case "qualified":
      return "success";

    case "needs_review":
    case "waiting_approval":
    case "revision_requested":
    case "proposal_needed":
    case "discovery_scheduled":
    case "negotiation":
    case "pending":
      return "warning";

    case "failed":
    case "rejected":
    case "lost":
    case "unqualified":
      return "danger";

    case "published":
    case "sent":
    case "active":
    case "active_opportunity":
    case "proposal_sent":
    case "asset_pack_generated":
      return "info";

    case "running":
    case "queued":
    case "researching":
      return "purple";

    default:
      return "neutral";
  }
}

export function getVipStatusClasses(status: string | null | undefined) {
  const tone = getVipStatusTone(status);

  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "purple":
      return "border-violet-200 bg-violet-50 text-violet-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}
