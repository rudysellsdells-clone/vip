"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(app)/analytics/Analytics.module.css";

export type AnalyticsSyncRunView = {
  id: string;
  sourceName: string;
  sourceType: "native" | "ga4";
  triggerType: string;
  status: "running" | "completed" | "failed";
  startDate: string;
  endDate: string;
  rowsProcessed: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "In progress";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AnalyticsOperationsPanel({
  runs,
  canManage,
  cronConfigured,
}: {
  runs: AnalyticsSyncRunView[];
  canManage: boolean;
  cronConfigured: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function retry(run: AnalyticsSyncRunView) {
    setBusyId(run.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/analytics/sync-runs/${run.id}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Analytics sync retry failed.");
      setMessage(`${run.sourceName} was synchronized successfully.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Analytics sync retry failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelEyebrow}>Data operations</p>
          <h2>Synchronization health</h2>
          <p className={styles.panelCopy}>
            Marketing VIP records every native rollup and GA4 import so failed or delayed reporting is visible instead of silent.
          </p>
        </div>
        <span className={cronConfigured ? styles.statusReady : styles.statusWarning}>
          {cronConfigured ? "Daily automation configured" : "CRON_SECRET required"}
        </span>
      </div>

      {message ? <div className={styles.setupSuccess}>{message}</div> : null}

      {runs.length ? (
        <div className={styles.syncTable}>
          <div className={styles.syncHeader}>
            <span>Source</span>
            <span>Range</span>
            <span>Trigger</span>
            <span>Status</span>
            <span>Completed</span>
            <span />
          </div>
          {runs.map((run) => (
            <div key={run.id} className={styles.syncRow}>
              <div>
                <strong>{run.sourceName}</strong>
                <span>{run.sourceType === "ga4" ? "Google Analytics 4" : "Marketing VIP Native"}</span>
              </div>
              <span>{run.startDate}–{run.endDate}</span>
              <span className={styles.capitalize}>{run.triggerType}</span>
              <span className={
                run.status === "completed"
                  ? styles.syncCompleted
                  : run.status === "failed"
                    ? styles.syncFailed
                    : styles.syncRunning
              }>
                {run.status}
              </span>
              <span>{formatDateTime(run.completedAt ?? run.startedAt)}</span>
              <div>
                {run.status === "failed" && canManage ? (
                  <button
                    type="button"
                    className={styles.setupSecondaryButton}
                    disabled={busyId === run.id}
                    onClick={() => retry(run)}
                    title={run.errorMessage ?? "Retry failed synchronization"}
                  >
                    {busyId === run.id ? "Retrying…" : "Retry"}
                  </button>
                ) : (
                  <span className={styles.rowsProcessed}>{run.rowsProcessed} rows</span>
                )}
              </div>
              {run.errorMessage ? <p className={styles.syncErrorMessage}>{run.errorMessage}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <strong>No synchronization history yet.</strong>
          <p>The first manual refresh or scheduled run will create an auditable record here.</p>
        </div>
      )}
    </section>
  );
}
