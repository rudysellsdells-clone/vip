"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function QualityReviewButton({
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

  async function handleReview() {
    const confirmed = window.confirm(
      "Run a quality and brand intelligence review for this asset?"
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/quality-review`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to review asset quality.");
      }

      setMessage(`Quality review complete. Score: ${result.review?.overall_score ?? "N/A"}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected review error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleReview}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Reviewing..." : "Review Quality"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
