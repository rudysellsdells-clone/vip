"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function BulkQualityReviewButton({
  month,
}: {
  month: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [regenerateWeakAssets, setRegenerateWeakAssets] = useState(true);
  const [includeAlreadyChecked, setIncludeAlreadyChecked] = useState(false);
  const [maxRegenerations, setMaxRegenerations] = useState(1);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runBulkReview() {
    const confirmed = window.confirm(
      `Run quality review for all active generated assets in ${month}? ${
        regenerateWeakAssets
          ? `Weak assets will regenerate up to ${maxRegenerations} time(s).`
          : "Weak assets will be flagged for human review without regeneration."
      }`
    );

    if (!confirmed) return;

    setRunning(true);
    setSummary(null);
    setError(null);

    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/bulk-quality-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          regenerateWeakAssets,
          maxRegenerations,
          includeAlreadyChecked,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to run bulk quality review.");
      }

      setSummary(result);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected bulk quality review error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Bulk quality review</h3>
        <p className={formStyles.description}>
          Score every active generated asset in this month at once. Weak assets can regenerate automatically from the quality feedback.
        </p>
      </div>

      <div className={websiteStyles.card}>
        <p className={websiteStyles.cardText}>
          This is the bulk version of opening each asset and running quality review manually.
        </p>
        <p className={websiteStyles.cardMeta}>
          Passing assets become review-ready. Failed originals are kept traceable if a regenerated version replaces them.
        </p>
      </div>

      <label className={formStyles.checkboxLabel}>
        <input
          type="checkbox"
          checked={regenerateWeakAssets}
          onChange={(event) => setRegenerateWeakAssets(event.target.checked)}
        />
        <span>Automatically regenerate weak assets using quality feedback</span>
      </label>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Maximum regenerations per asset</span>
        <select
          value={maxRegenerations}
          onChange={(event) => setMaxRegenerations(Number(event.target.value))}
          className={formStyles.select}
          disabled={!regenerateWeakAssets}
        >
          <option value={0}>0 — review only</option>
          <option value={1}>1 — recommended</option>
          <option value={2}>2 — aggressive</option>
        </select>
      </label>

      <label className={formStyles.checkboxLabel}>
        <input
          type="checkbox"
          checked={includeAlreadyChecked}
          onChange={(event) => setIncludeAlreadyChecked(event.target.checked)}
        />
        <span>Re-review assets that were already quality checked</span>
      </label>

      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={runBulkReview}
          disabled={running}
          className={formStyles.submit}
        >
          {running ? "Running Bulk Review..." : "Run Bulk Quality Review"}
        </button>
      </div>

      {summary ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Reviewed {summary.scored ?? 0} asset(s), passed {summary.passed ?? 0}, regenerated{" "}
            {summary.regenerated ?? 0}, flagged {summary.humanReviewNeeded ?? 0}, and skipped{" "}
            {summary.skipped ?? 0}.
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
