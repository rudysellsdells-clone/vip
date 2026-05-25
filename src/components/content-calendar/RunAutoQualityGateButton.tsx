"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function RunAutoQualityGateButton({
  month,
}: {
  month: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [maxRegenerations, setMaxRegenerations] = useState(1);
  const [autoApprovePassing, setAutoApprovePassing] = useState(false);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runGate() {
    const confirmed = window.confirm(
      autoApprovePassing
        ? `Run auto quality scoring for ${month}? Passing assets will be automatically approved. Failing assets will regenerate up to ${maxRegenerations} time(s).`
        : `Run auto quality scoring for ${month}? Passing assets will become review-ready. Failing assets will regenerate up to ${maxRegenerations} time(s).`
    );

    if (!confirmed) return;

    setRunning(true);
    setSummary(null);
    setError(null);

    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/auto-quality", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          maxRegenerations,
          autoApprovePassing,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to run auto quality gate.");
      }

      setSummary(result);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected auto quality gate error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Auto quality before review</h3>
        <p className={formStyles.description}>
          Score this month’s active assets before human review. Weak assets regenerate using the quality feedback.
        </p>
      </div>

      <div className={websiteStyles.card}>
        <p className={websiteStyles.cardText}>
          Passing assets can either become review-ready or be automatically approved.
        </p>
        <p className={websiteStyles.cardMeta}>
          Assets that still fail after regeneration are sent to human review.
        </p>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Maximum auto-regenerations per asset</span>
        <select
          value={maxRegenerations}
          onChange={(event) => setMaxRegenerations(Number(event.target.value))}
          className={formStyles.select}
        >
          <option value={0}>0 — score only</option>
          <option value={1}>1 — recommended</option>
          <option value={2}>2 — aggressive</option>
        </select>
      </label>

      <label className={formStyles.checkboxLabel}>
        <input
          type="checkbox"
          checked={autoApprovePassing}
          onChange={(event) => setAutoApprovePassing(event.target.checked)}
        />
        <span>Automatically approve assets that pass the quality gate</span>
      </label>

      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={runGate}
          disabled={running}
          className={formStyles.submit}
        >
          {running ? "Running Quality Gate..." : "Run Auto Quality Gate"}
        </button>
      </div>

      {summary ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Scored {summary.scored ?? 0} asset(s), passed {summary.passed ?? 0}, regenerated{" "}
            {summary.regenerated ?? 0}, auto-approved {summary.autoApproved ?? 0}, and flagged{" "}
            {summary.humanReviewNeeded ?? 0} for human review.
          </p>

          {Array.isArray(summary.errors) && summary.errors.length ? (
            <p className={formStyles.error}>
              {summary.errors.length} issue(s): {summary.errors.slice(0, 3).join(" | ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
