"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateAssetPackButton({
  campaignId,
  hasAssets,
}: {
  campaignId: string;
  hasAssets: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/campaigns/${campaignId}/generate`, {
      method: "POST",
    });

    const result = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "Could not generate the asset pack.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Marketing Asset Pack</h2>
          <p className="mt-1 text-sm text-slate-600">
            Generate campaign strategy, channel copy, video script, and a GalaxyAI prompt.
          </p>
          {hasAssets && (
            <p className="mt-2 text-xs text-amber-700">
              This campaign already has assets. Generating again will add a new set of drafts.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Generating..." : hasAssets ? "Generate Another Pack" : "Generate Asset Pack"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
