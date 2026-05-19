"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function StartLumaYoutubeVideoButton({
  campaignId,
  disabled = false,
}: {
  campaignId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    const confirmed = window.confirm(
      "Start a Luma 20-second YouTube video run for this campaign? This may use Luma credits."
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/luma-youtube-video/start`,
        {
          method: "POST",
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to start Luma YouTube video.");
      }

      setMessage("Luma YouTube video started. Sync the run as scenes complete.");
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
        onClick={handleStart}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Starting Luma..." : "Start Luma 20s YouTube Video"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
