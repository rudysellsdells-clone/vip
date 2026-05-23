"use client";

import { useEffect, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

type Decision = {
  id: string;
  decision: string;
  passed: boolean;
  reason: string | null;
  created_at: string;
};

function decisionLabel(value: string | null | undefined) {
  return String(value ?? "not_evaluated").replaceAll("_", " ");
}

export function QualityGateActionPanel({
  assetId,
  reviewId,
  disabled = false,
}: {
  assetId: string;
  reviewId?: string | null;
  disabled?: boolean;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDecision() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/quality-gate/latest`, {
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load quality gate decision.");
      }

      setDecision(result.decision ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected quality gate load error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDecision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  async function applyGate() {
    if (!reviewId) {
      setError("Run a quality review before applying the quality gate.");
      return;
    }

    const confirmed = window.confirm(
      "Apply the current quality thresholds to this review?"
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/quality-reviews/${reviewId}/gate`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to apply quality gate.");
      }

      setDecision(result.decision ?? null);
      setMessage(result.evaluation?.reason ?? "Quality gate evaluated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected quality gate error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {loading ? (
          <span className={websiteStyles.badge}>Loading gate...</span>
        ) : decision ? (
          <>
            <span className={websiteStyles.badge}>
              Gate: {decisionLabel(decision.decision)}
            </span>
            <span className={websiteStyles.badge}>
              {decision.passed ? "Passed" : "Did not pass"}
            </span>
          </>
        ) : (
          <span className={websiteStyles.badge}>Gate not applied</span>
        )}
      </div>

      {decision?.reason ? (
        <p className={websiteStyles.cardMeta}>{decision.reason}</p>
      ) : null}

      <button
        type="button"
        onClick={applyGate}
        disabled={disabled || !reviewId || running}
        className={formStyles.secondaryButton}
      >
        {running ? "Applying Gate..." : "Apply Quality Gate"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
