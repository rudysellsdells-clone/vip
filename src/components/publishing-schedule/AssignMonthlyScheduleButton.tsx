"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function AssignMonthlyScheduleButton() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function assignSchedule() {
    const confirmed = window.confirm(
      overwriteExisting
        ? "Assign a monthly publish schedule and overwrite existing scheduled times?"
        : "Assign a monthly publish schedule to unscheduled assets only?"
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/publishing-schedule/assign-month", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: Number(year),
          month: Number(month),
          timezone: "America/Chicago",
          overwriteExisting,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to assign monthly schedule.");
      }

      setMessage(`Scheduled ${result.scheduledCount ?? 0} asset(s).`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected scheduling error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Month</span>
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className={formStyles.select}
          >
            {Array.from({ length: 12 }).map((_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Intl.DateTimeFormat("en-US", { month: "long" }).format(
                  new Date(2026, index, 1)
                )}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Year</span>
          <input
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className={formStyles.input}
            type="number"
            min="2024"
            max="2100"
          />
        </label>

        <label className={formStyles.checkboxLabel}>
          <input
            type="checkbox"
            checked={overwriteExisting}
            onChange={(event) => setOverwriteExisting(event.target.checked)}
          />
          <span>Overwrite existing scheduled times</span>
        </label>
      </div>

      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={assignSchedule}
          disabled={running}
          className={formStyles.submit}
        >
          {running ? "Scheduling..." : "Assign Monthly Schedule"}
        </button>
      </div>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
