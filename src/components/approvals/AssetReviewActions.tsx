"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AssetReviewActions({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(action: "approve" | "reject" | "revise") {
    setLoadingAction(action);
    setMessage(null);

    const body = action === "revise" ? { notes: revisionNotes } : {};

    const response = await fetch(`/api/assets/${assetId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));
    setLoadingAction(null);

    if (!response.ok) {
      setMessage(result.error ?? "Something went wrong.");
      return;
    }

    if (action === "revise") setRevisionNotes("");
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runAction("approve")}
          disabled={Boolean(loadingAction)}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loadingAction === "approve" ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => runAction("reject")}
          disabled={Boolean(loadingAction)}
          className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loadingAction === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>

      <div className="space-y-2">
        <textarea
          value={revisionNotes}
          onChange={(event) => setRevisionNotes(event.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          rows={2}
          placeholder="Revision notes"
        />
        <button
          type="button"
          onClick={() => runAction("revise")}
          disabled={Boolean(loadingAction) || revisionNotes.trim().length < 3}
          className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60"
        >
          {loadingAction === "revise" ? "Saving..." : "Request Revision"}
        </button>
      </div>

      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}
