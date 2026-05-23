"use client";

import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function ApplyQualityGateButton({
  reviewId,
  disabled = false,
}: {
  reviewId: string;
  disabled?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyGate() {
    const confirmed = window.confirm(
      "Apply the current quality thresholds to this review?"
    );

    if (!confirmed) return;

    setRunning(true);
    setDecision(null);
    setReason(null);
    setError(null);

    try {
      const response = await fetch(`/api/quality-reviews/${reviewId}/gate`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to apply quality gate.");
      }

      setDecision(result.evaluation?.decision ?? "evaluated");
      setReason(result.evaluation?.reason ?? "Quality gate evaluated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected quality gate error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={applyGate}
        disabled={disabled || running}
        className={formStyles.secondaryButton}
      >
        {running ? "Checking..." : "Apply Quality Gate"}
      </button>

      {decision ? (
        <p className={websiteStyles.cardMeta}>
          Decision: {decision.replaceAll("_", " ")}
        </p>
      ) : null}

      {reason ? <p className={formStyles.message}>{reason}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
