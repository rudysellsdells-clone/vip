"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function RequestQualityResubmissionButton({
  reviewId,
  disabled = false,
}: {
  reviewId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResubmit() {
    const confirmed = window.confirm(
      "Request a new version based on this quality review? VIP will create a new asset and send it back to the review queue."
    );

    if (!confirmed) return;

    setRunning(true);
    setAssetId(null);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/quality-reviews/${reviewId}/resubmit`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to request quality resubmission.");
      }

      setAssetId(result.asset?.id ?? null);
      setMessage("New version created and sent to review.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected resubmission error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleResubmit}
        disabled={disabled || running}
        className={formStyles.secondaryButton}
      >
        {running ? "Creating New Version..." : "Request Improved Version"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}

      {assetId ? (
        <Link href={`/assets/${assetId}`} className={websiteStyles.link}>
          Open new version →
        </Link>
      ) : null}
    </div>
  );
}
