"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function SyncGalaxyWorkflowsButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/galaxyai/workflows", {
        method: "GET",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to sync GalaxyAI workflows.");
      }

      setMessage("GalaxyAI workflows synced.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSync}
        disabled={running}
        className={websiteStyles.primarySubmit}
      >
        {running ? "Syncing..." : "Sync Workflows"}
      </button>
      {message ? <p className="mt-2 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-rose-700">{error}</p> : null}
    </div>
  );
}
