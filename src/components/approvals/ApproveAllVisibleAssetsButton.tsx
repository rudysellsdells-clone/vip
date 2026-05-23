"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function ApproveAllVisibleAssetsButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approveAll() {
    const confirmed = window.confirm(
      "Approve all active assets currently waiting for review? Quality review is recommended before bulk approval."
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/approvals/approve-all", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to approve all assets.");
      }

      setMessage(`Approved ${result.approvedCount ?? 0} asset(s).`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected approve-all error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={approveAll}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Approving..." : "Approve All Visible Review Assets"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
