import Link from "next/link";
import type {
  CampaignWorkspaceStageStatus,
  CampaignWorkspaceState,
} from "@/lib/campaigns/campaign-workspace";

function statusClasses(status: CampaignWorkspaceStageStatus) {
  if (status === "complete") {
    return "border-emerald-200 bg-emerald-50 text-emerald-950";
  }
  if (status === "current") {
    return "border-blue-300 bg-blue-50 text-blue-950 ring-2 ring-blue-100";
  }
  if (status === "attention") {
    return "border-amber-300 bg-amber-50 text-amber-950 ring-2 ring-amber-100";
  }
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function statusLabel(status: CampaignWorkspaceStageStatus) {
  if (status === "complete") return "Complete";
  if (status === "current") return "Current";
  if (status === "attention") return "Needs attention";
  return "Locked";
}

export function CampaignWorkspaceProgress({
  workspace,
}: {
  workspace: CampaignWorkspaceState;
}) {
  return (
    <section className="border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Campaign Workspace
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            One guided path from brief to execution
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            VIP keeps strategy, generation, review, and activation connected so the
            campaign does not become a collection of disconnected screens.
          </p>
        </div>
        <div className="min-w-52">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.1em] text-slate-500">
            <span>Progress</span>
            <span>{workspace.progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950"
              style={{ width: `${workspace.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {workspace.stages.map((stage, index) => (
          <Link
            key={stage.id}
            href={stage.href}
            aria-disabled={stage.status === "locked"}
            className={`border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${statusClasses(stage.status)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.12em]">
                {index + 1}. {stage.label}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">
                {statusLabel(stage.status)}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 opacity-80">{stage.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4 border-l-4 border-blue-500 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">
            Recommended next action
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            {workspace.nextAction.label}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {workspace.nextAction.description}
          </p>
        </div>
        <Link
          href={workspace.nextAction.href}
          className="inline-flex shrink-0 items-center justify-center bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
        >
          Go to next step →
        </Link>
      </div>
    </section>
  );
}
