"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshGalaxyAiRunButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshRun() {
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/galaxyai/runs/${runId}`, {
      method: "GET",
    });

    const result = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error ?? "Could not refresh run status.");
      return;
    }

    setMessage(`Status: ${result.run?.status ?? "updated"}`);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={refreshRun}
        disabled={loading}
        className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60"
      >
        {loading ? "Checking..." : "Check Status"}
      </button>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}
