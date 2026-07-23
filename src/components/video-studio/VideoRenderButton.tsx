"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type VideoWorkflowOption = {
  id: string;
  name: string;
};

export function VideoRenderButton({
  assetId,
  provider,
  status,
  workflows,
  existingRunId,
  canManage,
}: {
  assetId: string;
  provider: "luma" | "magica";
  status: string;
  workflows: VideoWorkflowOption[];
  existingRunId: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (existingRunId) {
    return <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Render started</span>;
  }
  if (status !== "approved") {
    return <Link href="/approvals" className="text-sm font-black underline">Review and approve →</Link>;
  }

  async function startRender() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/video-studio/assets/${assetId}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: provider === "magica" ? workflowId : null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to start render.");
      setMessage(`${provider === "luma" ? "Luma" : "Magica"} render started.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start render.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      {provider === "magica" ? (
        <select
          value={workflowId}
          onChange={(event) => setWorkflowId(event.target.value)}
          className="mb-3 w-full border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {workflows.length ? workflows.map((workflow) => (
            <option key={workflow.id} value={workflow.id}>{workflow.name}</option>
          )) : <option value="">No active Magica video workflow</option>}
        </select>
      ) : null}
      <button
        type="button"
        disabled={!canManage || busy || (provider === "magica" && !workflowId)}
        onClick={startRender}
        className="inline-flex min-h-10 items-center justify-center bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
      >
        {busy ? "Starting Render…" : `Render with ${provider === "luma" ? "Luma" : "Magica"}`}
      </button>
      {message ? <p className="mt-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
