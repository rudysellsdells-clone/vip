"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RecoveryResult = {
  status?: string;
  mediaCount?: number;
  mediaPending?: boolean;
  recoveredAssetId?: string | null;
  mediaRetrievalError?: string | null;
  assetCreationError?: string | null;
};

export function RefreshGalaxyAiRunButton({
  runId,
  initialStatus = "queued",
}: {
  runId: string;
  initialStatus?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);

  async function refreshRun() {
    setLoading(true);
    setMessage(null);
    setError(null);
    setAssetId(null);

    try {
      const response = await fetch(`/api/galaxyai/runs/${runId}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Could not refresh GalaxyAI run status.");
      }

      const recovery = (result.recovery ?? {}) as RecoveryResult;
      const status = String(result.run?.status ?? recovery.status ?? "updated");
      const recoveredAssetId = recovery.recoveredAssetId ?? null;

      if (recovery.assetCreationError) {
        setError(
          `GalaxyAI completed, but VIP could not create the review asset: ${recovery.assetCreationError}`,
        );
      } else if (status === "completed" && recoveredAssetId) {
        setAssetId(recoveredAssetId);
        setMessage("GalaxyAI output was received and added to the review queue.");
      } else if (status === "completed" && recovery.mediaPending) {
        setMessage(
          recovery.mediaRetrievalError
            ? `GalaxyAI completed, but the media endpoint is not ready: ${recovery.mediaRetrievalError}`
            : "GalaxyAI reports the run as complete, but the media file is still being indexed. Check again in a few moments.",
        );
      } else if (status === "failed" || status === "canceled") {
        setError(result.run?.error ?? `GalaxyAI run ${status}.`);
      } else {
        setMessage(`GalaxyAI run is ${status}.`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected GalaxyAI status error.");
    } finally {
      setLoading(false);
    }
  }

  const normalizedStatus = String(initialStatus ?? "").toLowerCase();
  const label =
    normalizedStatus === "completed"
      ? "Retrieve Output"
      : normalizedStatus === "failed" || normalizedStatus === "canceled"
        ? "Check Details"
        : "Check Status";

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={refreshRun}
        disabled={loading}
        className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60"
      >
        {loading ? "Checking..." : label}
      </button>
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
      {assetId ? (
        <Link href={`/assets/${assetId}`} className="text-xs font-semibold text-[#0b4a7a] underline">
          Open generated asset →
        </Link>
      ) : null}
    </div>
  );
}
