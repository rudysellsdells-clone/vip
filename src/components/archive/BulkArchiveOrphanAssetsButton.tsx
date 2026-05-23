"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function BulkArchiveOrphanAssetsButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    const confirmed = window.confirm(
      "Archive all active orphan campaign assets? This will move them out of working views and keep them available in the Archive."
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/archive/orphan-campaign-assets", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to bulk archive orphan campaign assets.");
      }

      setMessage(`Archived ${result.archivedAssetCount ?? 0} orphan asset(s).`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected archive error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleArchive}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Archiving..." : "Archive All Orphan Assets"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
