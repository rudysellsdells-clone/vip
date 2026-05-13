"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AssetReviewActions({
  assetId,
  status,
}: {
  assetId: string;
  status: string;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showRevisionBox, setShowRevisionBox] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: "approve" | "reject" | "revise", body?: Record<string, unknown>) {
    setLoadingAction(action);
    setError(null);

    const response = await fetch(`/api/assets/${assetId}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    });

    const result = await response.json().catch(() => ({}));
    setLoadingAction(null);

    if (!response.ok) {
      setError(result.error ?? `Could not ${action} asset.`);
      return;
    }

    setShowRevisionBox(false);
    setRevisionNotes("");
    router.refresh();
  }

  const isFinal = status === "approved" || status === "rejected" || status === "published" || status === "sent";

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      {isFinal ? (
        <p className="text-sm text-slate-500">This asset has already been marked as {status}.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runAction("approve")}
            disabled={Boolean(loadingAction)}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loadingAction === "approve" ? "Approving..." : "Approve"}
          </button>

          <button
            type="button"
            onClick={() => runAction("reject")}
            disabled={Boolean(loadingAction)}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loadingAction === "reject" ? "Rejecting..." : "Reject"}
          </button>

          <button
            type="button"
            onClick={() => setShowRevisionBox((current) => !current)}
            disabled={Boolean(loadingAction)}
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
          >
            Request Revision
          </button>
        </div>
      )}

      {showRevisionBox && !isFinal && (
        <div className="rounded-xl bg-slate-50 p-4">
          <label className="text-sm font-medium text-slate-800">Revision notes</label>
          <textarea
            value={revisionNotes}
            onChange={(event) => setRevisionNotes(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-lg border px-4 py-3 text-sm"
            placeholder="Tell the clone what to change. Example: Make this more direct, shorten the CTA, or focus more on booked calls."
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => runAction("revise", { notes: revisionNotes })}
              disabled={Boolean(loadingAction) || revisionNotes.trim().length < 3}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loadingAction === "revise" ? "Saving..." : "Save Revision Request"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRevisionBox(false);
                setRevisionNotes("");
                setError(null);
              }}
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
