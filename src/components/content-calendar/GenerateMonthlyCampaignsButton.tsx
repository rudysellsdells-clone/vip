"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function GenerateMonthlyCampaignsButton({
  defaultMonth,
}: {
  defaultMonth?: string;
}) {
  const router = useRouter();
  const initialMonth = useMemo(() => defaultMonth || currentMonthValue(), [defaultMonth]);
  const [month, setMonth] = useState(initialMonth);
  const [campaignTheme, setCampaignTheme] = useState("Authority Growth");
  const [businessContext, setBusinessContext] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const confirmed = window.confirm(
      "Generate one campaign per week for this month, including 1 blog post, 5 LinkedIn posts, 5 Facebook posts, 1 email, and 1 video script for each campaign?"
    );

    if (!confirmed) return;

    setRunning(true);
    setSummary(null);
    setError(null);

    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          campaignTheme,
          businessContext,
          overwriteExisting,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate monthly campaigns.");
      }

      setSummary(result);
      router.push(`/content-calendar/monthly?month=${encodeURIComponent(month)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected monthly campaign generation error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Generate monthly campaign package</h3>
        <p className={formStyles.description}>
          Creates one campaign per usable week and immediately generates the full asset package.
        </p>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Month</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className={formStyles.input}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Campaign Theme</span>
          <input
            value={campaignTheme}
            onChange={(event) => setCampaignTheme(event.target.value)}
            className={formStyles.input}
            placeholder="Authority Growth"
          />
        </label>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Business Context</span>
        <textarea
          value={businessContext}
          onChange={(event) => setBusinessContext(event.target.value)}
          className={formStyles.textarea}
          placeholder="Optional context for this month, such as target audience, offer, seasonal priority, or core message."
          rows={4}
        />
      </label>

      <label className={formStyles.checkboxLabel}>
        <input
          type="checkbox"
          checked={overwriteExisting}
          onChange={(event) => setOverwriteExisting(event.target.checked)}
        />
        <span>Allow another campaign set even if this month already has campaigns</span>
      </label>

      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={generate}
          disabled={running}
          className={formStyles.submit}
        >
          {running ? "Generating..." : "Generate Monthly Campaigns"}
        </button>
      </div>

      {summary ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Created {summary.campaignCount ?? 0} campaign(s) and {summary.assetCount ?? 0} asset(s).
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
