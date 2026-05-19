"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function ApproveAllAssetsButton({
  count,
  disabled = false,
}: {
  count: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApproveAll() {
    if (count <= 0) return;

    const confirmed = window.confirm(
      `Approve all ${count} asset${count === 1 ? "" : "s"} currently waiting for review? This does not publish anything. It only moves assets to approved.`
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

      setMessage(
        `Approved ${result.approvedCount ?? 0} asset${result.approvedCount === 1 ? "" : "s"}.`
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
        onClick={handleApproveAll}
        disabled={disabled || running || count <= 0}
        className={formStyles.submit}
      >
        {running ? "Approving..." : `Approve All (${count})`}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
