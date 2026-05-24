"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function DeleteMonthlyCampaignButton({
  month,
}: {
  month: string;
}) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [includeExecuted, setIncludeExecuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deleteMonth() {
    if (confirmText !== month) {
      setError(`Type ${month} to confirm.`);
      return;
    }

    const confirmed = window.confirm(
      `Delete all campaigns, generated assets, planned items, reviews, and publishing runs for ${month}? This cannot be undone.`
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/delete-month", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          confirmText,
          includeExecuted,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete monthly campaign package.");
      }

      setMessage(
        `Deleted ${result.deleted?.campaigns ?? 0} campaign(s), ${result.deleted?.generatedAssets ?? 0} asset(s), and ${result.deleted?.contentCalendarItems ?? 0} planned item(s).`
      );
      setConfirmText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected delete error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Reset this month</h3>
        <p className={formStyles.description}>
          Delete this month’s campaign package and all related assets before anything goes out the door.
        </p>
      </div>

      <div className={websiteStyles.card}>
        <p className={websiteStyles.cardText}>
          This will remove campaigns, generated assets, planned calendar items, quality reviews,
          gate decisions, and publishing runs connected to <strong>{month}</strong>.
        </p>

        <p className={websiteStyles.cardMeta}>
          Deletion is blocked if completed publishing runs exist, unless you explicitly include executed records below.
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

      <label className={formStyles.checkboxLabel}>
        <input
          type="checkbox"
          checked={includeExecuted}
          onChange={(event) => setIncludeExecuted(event.target.checked)}
        />
        <span>Also delete records with completed/sent publishing runs</span>
      </label>

      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={deleteMonth}
          disabled={running || confirmText !== month}
          className={formStyles.secondaryButton}
        >
          {running ? "Deleting..." : "Delete Monthly Campaign Package"}
        </button>
      </div>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
