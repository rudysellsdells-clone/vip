"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GenerateAssetPackButtonProps = {
  campaignId: string;
  hasAssets?: boolean;
};

export function GenerateAssetPackButton({
  campaignId,
  hasAssets = false,
}: GenerateAssetPackButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate asset pack.");
      }

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
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Generating..."
          : hasAssets
            ? "Regenerate Asset Pack"
            : "Generate Asset Pack"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
