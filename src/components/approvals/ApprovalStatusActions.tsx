"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function ApprovalStatusActions({
  assetId,
}: {
  assetId: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: "approved" | "needs_review") {
    const label = status === "approved" ? "approve" : "keep in review";

    const confirmed = window.confirm(`Are you sure you want to ${label} this asset?`);

    if (!confirmed) return;

    setRunning(status);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/approval-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update approval status.");
      }

      setMessage(status === "approved" ? "Asset approved." : "Asset kept in review.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected approval status error.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="grid gap-2">
      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={() => updateStatus("approved")}
          disabled={Boolean(running)}
          className={formStyles.submit}
        >
          {running === "approved" ? "Approving..." : "Approve Asset"}
        </button>

        <button
          type="button"
          onClick={() => updateStatus("needs_review")}
          disabled={Boolean(running)}
          className={formStyles.secondaryButton}
        >
          {running === "needs_review" ? "Updating..." : "Keep in Review"}
        </button>
      </div>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
