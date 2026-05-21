"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function GenerateProspectWhatIfStoryButton({
  prospectId,
  disabled = false,
}: {
  prospectId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    const confirmed = window.confirm(
      "Generate a personalized What-If Success Story for this prospect? The asset will be sent to approvals."
    );

    if (!confirmed) return;

    setRunning(true);
    setAssetId(null);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}/what-if-stories/generate`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate prospect What-If Story.");
      }

      setAssetId(result.asset?.id ?? null);
      setMessage("What-If Story generated and sent to approvals.");
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
        {running ? "Generating..." : "Generate What-If Story"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}

      {assetId ? (
        <Link href={`/assets/${assetId}`} className={websiteStyles.link}>
          Open generated story →
        </Link>
      ) : null}
    </div>
  );
}
