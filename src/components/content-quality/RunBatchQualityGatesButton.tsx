"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function RunBatchQualityGatesButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runBatch() {
    const confirmed = window.confirm(
      "Apply the current quality thresholds to the latest reviewed assets? Existing gate decisions for the same review will be skipped."
    );

    if (!confirmed) return;

    setRunning(true);
    setSummary(null);
    setError(null);

    try {
      const response = await fetch("/api/content-quality/gates/apply-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: 75,
          skipExistingReviewDecisions: true,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to run batch quality gates.");
      }

      setSummary(result.result ?? {});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected batch quality gate error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={runBatch}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Running Quality Gates..." : "Run Batch Quality Gates"}
      </button>

      {summary ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Evaluated {summary.evaluatedCount ?? 0} review(s). Ready{" "}
            {summary.readyCount ?? 0}, auto-approved {summary.autoApprovedCount ?? 0}, needs
            revision {summary.needsRevisionCount ?? 0}, skipped {summary.skippedCount ?? 0}.
          </p>
        </div>
      ) : null}

      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
