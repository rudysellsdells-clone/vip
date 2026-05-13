"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ExecuteGmailDraftButtonProps = {
  toolRunId: string;
  isRetry?: boolean;
};

export function ExecuteGmailDraftButton({
  toolRunId,
  isRetry = false,
}: ExecuteGmailDraftButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExecute() {
    const confirmed = window.confirm(
      isRetry
        ? "Retry creating this Gmail draft? This will NOT send the email."
        : "Create a Gmail draft from this approved VIP asset? This will NOT send the email."
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/zapier/gmail-draft/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toolRunId }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create Gmail draft.");
      }

      setMessage("Gmail draft created.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleExecute}
        disabled={loading}
        className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Creating Draft..."
          : isRetry
            ? "Retry Gmail Draft"
            : "Create Gmail Draft"}
      </button>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
