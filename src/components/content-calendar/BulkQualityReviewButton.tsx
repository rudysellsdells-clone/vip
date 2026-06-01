"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";
import { readableError } from "@/lib/errors/readable-error";

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

type Totals = {
  reviewed: number;
  passed: number;
  failed: number;
  errors: string[];
  batches: number;
};

export function BulkQualityReviewButton({ month }: { month: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [includeAlreadyChecked, setIncludeAlreadyChecked] = useState(false);
  const [batchSize, setBatchSize] = useState(15);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [totals, setTotals] = useState<Totals>({
    reviewed: 0,
    passed: 0,
    failed: 0,
    errors: [],
    batches: 0,
  });
  const [error, setError] = useState<string | null>(null);

  async function runBatch() {
    const response = await fetch("/api/content-calendar/monthly-campaigns/bulk-quality-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        includeAlreadyChecked,
        batchSize,
      }),
    });

    const payload = await readResponse(response);

    if (!response.ok) {
      throw new Error(`${readableError(payload, "Bulk quality review failed.")} — HTTP ${response.status}`);
    }

    return payload as Record<string, any>;
  }

  async function run() {
    setRunning(true);
    setResult(null);
    setError(null);
    setTotals({ reviewed: 0, passed: 0, failed: 0, errors: [], batches: 0 });

    try {
      let hasMore = true;
      let safety = 0;

      const nextTotals: Totals = {
        reviewed: 0,
        passed: 0,
        failed: 0,
        errors: [],
        batches: 0,
      };

      while (hasMore && safety < 40) {
        safety += 1;

        const payload = await runBatch();

        setResult(payload);

        nextTotals.reviewed += Number(payload.reviewed ?? 0);
        nextTotals.passed += Number(payload.passed ?? 0);
        nextTotals.failed += Number(payload.failed ?? 0);
        nextTotals.batches += 1;

        if (Array.isArray(payload.errors)) {
          nextTotals.errors.push(...payload.errors.map(String));
        }

        setTotals({ ...nextTotals });

        hasMore = Boolean(payload.hasMore);

        if ((payload.reviewed ?? 0) === 0 && !payload.hasMore) {
          break;
        }

        if ((payload.reviewed ?? 0) === 0 && payload.hasMore) {
          throw new Error(readableError(payload, "Quality review made no progress."));
        }
      }

      if (safety >= 40) {
        throw new Error("Quality review stopped after 40 batches to prevent an endless loop.");
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
        <p className={formStyles.description}>
          Runs a fast deterministic quality pass for workflow testing and approval routing.
        </p>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Batch size</span>
          <select
            value={batchSize}
            onChange={(event) => setBatchSize(Number(event.target.value))}
            className={formStyles.select}
          >
            <option value={5}>5 assets/request</option>
            <option value={10}>10 assets/request</option>
            <option value={15}>15 assets/request</option>
            <option value={25}>25 assets/request</option>
          </select>
        </label>
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

      {running || totals.batches > 0 ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Batches: {totals.batches} · Reviewed: {totals.reviewed} · Passed: {totals.passed} · Failed: {totals.failed}
          </p>
          {running ? <p className={websiteStyles.cardMeta}>Still running...</p> : null}
        </div>
      ) : null}

      {result ? (
        <div className={websiteStyles.card}>
          <p className={websiteStyles.cardText}>
            Latest batch reviewed {result.reviewed ?? 0} of {result.reviewableCount ?? 0} reviewable asset(s).
          </p>
          <p className={websiteStyles.cardMeta}>
            Mode: {result.mode ?? "unknown"} · Remaining: {result.remainingAfterBatch ?? 0} · Duration: {result.durationMs ?? 0}ms
          </p>

          {Array.isArray(result.errors) && result.errors.length ? (
            <p className={formStyles.error}>
              {result.errors.length} issue(s):{" "}
              {result.errors.map((item: unknown) => readableError(item, "Unknown issue")).slice(0, 3).join(" | ")}
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
