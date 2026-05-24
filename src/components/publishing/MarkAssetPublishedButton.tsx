"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function MarkAssetPublishedButton({
  assetId,
  label = "Mark Published",
  disabled = false,
}: {
  assetId: string;
  label?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markPublished() {
    const confirmed = window.confirm(
      "Mark this asset as published/sent? Use this after completing the manual publishing step."
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/mark-published`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to mark asset published.");
      }

      setMessage("Asset marked published.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected publish status error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={markPublished}
        disabled={disabled || running}
        className={formStyles.secondaryButton}
      >
        {running ? "Updating..." : label}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
