"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncGalaxyAiWorkflowsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function syncWorkflows() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/galaxyai/workflows", {
      method: "GET",
    });

    const result = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error ?? "Could not sync GalaxyAI workflows.");
      return;
    }

    setMessage(`Synced ${result.workflows?.length ?? 0} workflows.`);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={syncWorkflows}
        disabled={loading}
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Syncing..." : "Sync GalaxyAI Workflows"}
      </button>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
