"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function ApproveReviewReadyMonthButton({
  month,
}: {
  month: string;
}) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approveMonth() {
    if (confirmText !== month) {
      setError(`Type ${month} to confirm.`);
      return;
    }

    const confirmed = window.confirm(
      `Approve all quality-passed, active assets for ${month}? This moves them into the downstream approval/publishing flow.`
    );

    if (!confirmed) return;

    setRunning(true);
    setSummary(null);
    setError(null);

    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/approve-review-ready", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          confirmText,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to approve review-ready assets.");
      }

      setSummary(result);
      setConfirmText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected bulk approval error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Approve quality-passed assets</h3>
        <p className={formStyles.description}>
          Bulk approve all active assets in this month that passed the auto quality gate.
        </p>
      </div>

      <div className={websiteStyles.card}>
        <p className={websiteStyles.cardText}>
          This skips one-by-one review for assets that already passed quality scoring.
        </p>
        <p className={websiteStyles.cardMeta}>
          Assets that failed quality or still need human review are not approved by this action.
        </p>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Type {month} to confirm</span>
        <input
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          className={formStyles.input}
          placeholder={month}
        />
      </label>

      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={approveMonth}
          disabled={running || confirmText !== month}
          className={formStyles.submit}
        >
          {running ? "Approving..." : "Approve Quality-Passed Assets"}
        </button>
      </div>

      {summary ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Approved {summary.approvedCount ?? 0} asset(s) for {month}.
          </p>
        </div>
      ) : null}

      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
