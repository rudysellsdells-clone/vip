"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";
import { readableError } from "@/lib/errors/readable-error";

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { error: text }; }
}

export function BulkQualityReviewButton({ month }: { month: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [includeAlreadyChecked, setIncludeAlreadyChecked] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/content-calendar/monthly-campaigns/bulk-quality-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, includeAlreadyChecked }),
      });

      const payload = await readResponse(response);
      setResult(payload);

      if (!response.ok) {
        throw new Error(`${readableError(payload, "Bulk quality review failed.")} — HTTP ${response.status}`);
      }

      if ((payload.reviewed ?? 0) === 0) {
        setError("Quality review finished, but no reviews were saved. Check the details below.");
      }

      router.refresh();
    } catch (err) {
      setError(readableError(err, "Bulk quality review failed."));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Bulk quality review</h3>
        <p className={formStyles.description}>Score active, latest-version assets for the selected month.</p>
      </div>

      <label className={formStyles.checkboxLabel}>
        <input
          type="checkbox"
          checked={includeAlreadyChecked}
          onChange={(event) => setIncludeAlreadyChecked(event.target.checked)}
        />
        <span>Include assets that were already quality checked</span>
      </label>

      <div className={formStyles.actions}>
        <button type="button" onClick={run} disabled={running} className={formStyles.submit}>
          {running ? "Running Quality Review..." : "Run Bulk Quality Review"}
        </button>
      </div>

      {result ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Reviewed {result.reviewed ?? 0} of {result.reviewableCount ?? 0} reviewable asset(s).
          </p>
          <p className={websiteStyles.cardMeta}>
            Passed: {result.passed ?? 0} · Failed: {result.failed ?? 0} · Skipped: {result.skipped ?? 0}
            {result.durationMs ? ` · ${result.durationMs}ms` : ""}
          </p>
          {Array.isArray(result.errors) && result.errors.length ? (
            <p className={formStyles.error}>
              {result.errors.length} issue(s): {result.errors.map((item: unknown) => readableError(item, "Unknown issue")).slice(0, 3).join(" | ")}
            </p>
          ) : null}
          {result.hint ? <p className={websiteStyles.cardMeta}>{readableError(result.hint, "")}</p> : null}
        </div>
      ) : null}

      {error ? <p className={formStyles.error}>{error}</p> : null}

      {result ? (
        <details className={websiteStyles.card}>
          <summary className={websiteStyles.cardTitle}>Quality review details</summary>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 12, fontSize: 12 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
