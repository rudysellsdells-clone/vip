"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PrepareZapierActionButtonProps = {
  assetId: string;
};

export function PrepareZapierActionButton({
  assetId,
}: PrepareZapierActionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePrepare() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/zapier/prepare-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assetId }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to prepare Zapier action.");
      }

      setMessage("Prepared for Zapier approval.");
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
        onClick={handlePrepare}
        disabled={loading}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Preparing..." : "Prepare Zapier Action"}
      </button>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
