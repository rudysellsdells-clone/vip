"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function SyncLumaVideoRunButton({
  runId,
  disabled = false,
}: {
  runId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/luma/video-runs/${runId}/sync`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to sync Luma video run.");
      }

      setMessage(result.message ?? "Luma run synced.");
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
        disabled={disabled || running}
        className={formStyles.secondaryButton}
      >
        {running ? "Syncing..." : "Sync Luma Run"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
