"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function GenerateCampaignAssetsButton({
  campaignId,
}: {
  campaignId: string;
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
      const response = await fetch(`/api/campaigns/${campaignId}/generate`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate assets.");
      }

      setMessage("Asset pack generated.");
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
        disabled={running}
        className={websiteStyles.primarySubmit}
      >
        {running ? "Generating..." : "Generate Asset Pack"}
      </button>
      {message ? <p className="mt-2 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-rose-700">{error}</p> : null}
    </div>
  );
}
