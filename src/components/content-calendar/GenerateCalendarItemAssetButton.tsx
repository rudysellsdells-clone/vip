"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

function actionLabel(itemType: string) {
  if (itemType === "weekly_campaign") {
    return "Create Campaign";
  }

  return "Generate Asset";
}

export function GenerateCalendarItemAssetButton({
  itemId,
  itemType,
  disabled = false,
}: {
  itemId: string;
  itemType: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/content-calendar/items/${itemId}/generate`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate from calendar item.");
      }

      setMessage(
        result.type === "campaign"
          ? "Campaign created."
          : "Asset generated and sent to review."
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
        onClick={handleGenerate}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Generating..." : actionLabel(itemType)}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
