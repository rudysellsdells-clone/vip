"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function ScheduleAssetButton({
  assetId,
  defaultValue = "",
}: {
  assetId: string;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue ? defaultValue.slice(0, 16) : "");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveSchedule() {
    if (!value) {
      setError("Choose a publish date and time.");
      return;
    }

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduled_publish_at: value,
          publish_timezone: "America/Chicago",
          scheduling_notes: "Manually scheduled from publishing schedule page.",
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to schedule asset.");
      }

      setMessage("Publish time saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected schedule save error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-2">
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={formStyles.input}
      />

      <button
        type="button"
        onClick={saveSchedule}
        disabled={running}
        className={formStyles.secondaryButton}
      >
        {running ? "Saving..." : "Save Publish Time"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
