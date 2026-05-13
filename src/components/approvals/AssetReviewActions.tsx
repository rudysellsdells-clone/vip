"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AssetReviewActionsProps = {
  assetId: string;
  status?: string | null;
};

export function AssetReviewActions({ assetId, status }: AssetReviewActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionBox, setShowRevisionBox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedStatus = status ?? "needs_review";
  const isFinal = normalizedStatus === "approved" || normalizedStatus === "rejected";

  async function runAction(action: "approve" | "reject" | "revise") {
    setError(null);
    setLoadingAction(action);

    const payload =
      action === "revise"
        ? { notes: revisionNotes.trim() }
        : revisionNotes.trim()
          ? { notes: revisionNotes.trim() }
          : {};

    if (action === "revise" && !revisionNotes.trim()) {
      setLoadingAction(null);
      setError("Please add revision notes before requesting a revision.");
      return;
    }

    const response = await fetch(`/api/assets/${assetId}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    setLoadingAction(null);

    if (!response.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    setRevisionNotes("");
    setShowRevisionBox(false);
    router.refresh();
  }

  if (isFinal) {
    return (
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Status: <span className="font-semibold">{normalizedStatus}</span>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
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
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          Request Revision
        </button>
      </div>

      {showRevisionBox && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-4">
          <label className="text-sm font-medium text-slate-700">Revision notes</label>
          <textarea
            value={revisionNotes}
            onChange={(event) => setRevisionNotes(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Tell the clone what needs to change."
          />
          <button
            type="button"
            onClick={() => runAction("revise")}
            disabled={Boolean(loadingAction)}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loadingAction === "revise" ? "Saving..." : "Save Revision Request"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
