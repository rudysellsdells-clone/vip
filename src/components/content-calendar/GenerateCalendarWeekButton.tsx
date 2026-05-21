"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function GenerateCalendarWeekButton({
  planId,
  weekNumber,
  disabled = false,
}: {
  planId: string;
  weekNumber: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateWeek() {
    const confirmed = window.confirm(
      `Generate the full Week ${weekNumber} package? This will create the weekly campaign and generate review-ready assets for the planned content items.`
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/content-calendar/plans/${planId}/weeks/${weekNumber}/generate`,
        {
          method: "POST",
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate week package.");
      }

      const errorNote =
        result.errors?.length > 0 ? ` ${result.errors.length} item(s) had errors.` : "";

      setMessage(
        `Week ${weekNumber} package generated. Created ${result.generatedAssetCount ?? 0} asset(s), skipped ${result.skippedCount ?? 0}.${errorNote}`
      );

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerateWeek}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Generating Week..." : `Generate Week ${weekNumber} Package`}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
