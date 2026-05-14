"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ExecuteFacebookPostButtonProps = {
  toolRunId: string;
  isRetry?: boolean;
  pageName: string;
};

export function ExecuteFacebookPostButton({
  toolRunId,
  isRetry = false,
  pageName,
}: ExecuteFacebookPostButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExecute() {
    const confirmed = window.confirm(
      isRetry
        ? `Retry creating this Facebook Page post on ${pageName}?`
        : `Publish this approved VIP asset to the locked Facebook Page: ${pageName}?`
    );

    if (!confirmed) {
      return;
    }

    const secondConfirmation = window.confirm(
      `Final confirmation: this will create a public Facebook Page post on ${pageName}. Continue?`
    );

    if (!secondConfirmation) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/zapier/facebook-post/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toolRunId }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create Facebook Page post.");
      }

      setMessage("Facebook Page post created.");
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
        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Publishing..."
          : isRetry
            ? "Retry Facebook Post"
            : "Publish to Locked Facebook Page"}
      </button>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
