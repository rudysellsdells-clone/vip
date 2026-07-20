"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  getVipManagedGalaxyWorkflowMetadata,
  recommendedWorkflowKindForAssetType,
} from "@/lib/galaxyai/workflow-metadata";

type WorkflowOption = {
  galaxy_workflow_id: string;
  name: string;
  metadata?: Record<string, unknown> | null;
};

function findDefaultWorkflowId(
  workflows: WorkflowOption[],
  assetType: string,
) {
  const recommendedKind = recommendedWorkflowKindForAssetType(assetType);

  if (recommendedKind) {
    const recommended = workflows.find((workflow) => {
      return getVipManagedGalaxyWorkflowMetadata(workflow.metadata)?.workflowKind === recommendedKind;
    });

    if (recommended?.galaxy_workflow_id) {
      return recommended.galaxy_workflow_id;
    }
  }

  return workflows[0]?.galaxy_workflow_id ?? "";
}

export function RunGalaxyAiAssetButton({
  assetId,
  campaignId,
  assetType,
  workflows,
}: {
  assetId: string;
  campaignId: string;
  assetType: string;
  workflows: WorkflowOption[];
}) {
  const router = useRouter();
  const [workflowId, setWorkflowId] = useState(findDefaultWorkflowId(workflows, assetType));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.galaxy_workflow_id === workflowId) ?? null,
    [workflowId, workflows],
  );

  const selectedVipMetadata = getVipManagedGalaxyWorkflowMetadata(selectedWorkflow?.metadata ?? null);

  async function startRun() {
    setLoading(true);
    setMessage(null);

    if (!workflowId) {
      setLoading(false);
      setMessage("Sync or provision a GalaxyAI workflow first.");
      return;
    }

    const response = await fetch("/api/galaxyai/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId,
        assetId,
        campaignId,
        values: {},
      }),
    });

    const result = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error ?? "Could not start GalaxyAI run.");
      return;
    }

    setMessage("GalaxyAI run started.");
    router.refresh();
  }

  if (!workflows.length) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Sync or provision GalaxyAI workflows before running this prompt.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label className="block text-xs font-semibold text-slate-600">GalaxyAI Workflow</label>
      <select
        value={workflowId}
        onChange={(event) => setWorkflowId(event.target.value)}
        className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
      >
        {workflows.map((workflow) => {
          const vip = getVipManagedGalaxyWorkflowMetadata(workflow.metadata);
          const suffix = vip ? ` — ${vip.displayKind}` : "";
          return (
            <option key={workflow.galaxy_workflow_id} value={workflow.galaxy_workflow_id}>
              {workflow.name}{suffix}
            </option>
          );
        })}
      </select>
      {selectedVipMetadata ? (
        <p className="text-xs text-slate-500">
          Recommended for: {selectedVipMetadata.recommendedAssetTypes.join(", ") || "GalaxyAI prompts"}.
        </p>
      ) : null}
      <button
        type="button"
        onClick={startRun}
        disabled={loading}
        className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Starting..." : "Run Approved Prompt in GalaxyAI"}
      </button>
      {message && <p className="text-xs text-slate-600">{message}</p>}
    </div>
  );
}
