"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function RepurposeAssetButton({
  assetId,
  disabled = false,
}: {
  assetId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRepurpose() {
    const confirmed = window.confirm(
      "Generate a repurposing pack from this source asset? This creates LinkedIn, Facebook, email, and video prompt assets in the review queue."
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/repurpose`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to repurpose this asset.");
      }

      setMessage(`Created ${result.assets?.length ?? 0} review-ready assets.`);
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
        onClick={handleRepurpose}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Repurposing..." : "Generate Repurpose Pack"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
