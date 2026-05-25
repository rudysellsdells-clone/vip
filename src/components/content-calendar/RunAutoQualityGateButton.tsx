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
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runGate() {
    const confirmed = window.confirm(
      `Run auto quality scoring for ${month}? Failing assets will be regenerated up to ${maxRegenerations} time(s) before human review.`
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
          Score this month’s active assets before human review. Weak assets regenerate once using the quality feedback.
        </p>
      </div>

      <div className={websiteStyles.card}>
        <p className={websiteStyles.cardText}>
          This keeps rough first drafts out of review and moves the best active version forward.
        </p>
        <p className={websiteStyles.cardMeta}>
          Original failed versions are kept traceable but hidden from the active review flow.
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
            {summary.regenerated ?? 0}, and flagged {summary.humanReviewNeeded ?? 0} for human review.
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
