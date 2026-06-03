"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

function labelFromTitle(title: string | null | undefined) {
  const cleaned = String(title ?? "this asset").trim();
  return cleaned || "this asset";
}

export function RemoveAssetButton({
  assetId,
  assetTitle,
  compact = false,
}: {
  assetId: string;
  assetTitle?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeAsset() {
    const confirmed = window.confirm(
      `Remove ${labelFromTitle(assetTitle)} from active VIP workflows? This archives the asset so history is preserved.`
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("reason", "Removed from active workflow by user");

      const response = await fetch(`/api/assets/${assetId}/archive`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to remove asset.");
      }

      setMessage("Asset removed from active workflow.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected asset removal error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={removeAsset}
        disabled={running}
        className={formStyles.secondaryButton}
        style={
          compact
            ? {
                minHeight: 40,
                padding: "0 14px",
                fontSize: 13,
              }
            : undefined
        }
      >
        {running ? "Removing..." : "Remove"}
      </button>
      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
