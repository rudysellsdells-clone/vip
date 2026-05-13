"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type WorkflowOption = {
  galaxy_workflow_id: string;
  name: string;
};

export function RunGalaxyAiAssetButton({
  assetId,
  campaignId,
  workflows,
}: {
  assetId: string;
  campaignId: string;
  workflows: WorkflowOption[];
}) {
  const router = useRouter();
  const [workflowId, setWorkflowId] = useState(workflows[0]?.galaxy_workflow_id ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startRun() {
    setLoading(true);
    setMessage(null);

    if (!workflowId) {
      setLoading(false);
      setMessage("Sync and select a GalaxyAI workflow first.");
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
        Sync GalaxyAI workflows before running this prompt.
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
        {workflows.map((workflow) => (
          <option key={workflow.galaxy_workflow_id} value={workflow.galaxy_workflow_id}>
            {workflow.name}
          </option>
        ))}
      </select>
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
