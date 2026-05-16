"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type RequestRevisionButtonProps = {
  assetId: string;
  assetTitle?: string | null;
};

export function RequestRevisionButton({
  assetId,
  assetTitle,
}: RequestRevisionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!instructions.trim()) {
      setError("Please enter revision instructions.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/revise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instructions,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create revision.");
      }

      setMessage("Revision created and moved to review.");
      setInstructions("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Request Revision
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-slate-50 p-4">
      <div>
        <h4 className="font-semibold">Request Revision</h4>
        <p className="mt-1 text-xs text-slate-500">
          {assetTitle ? `Revise: ${assetTitle}` : "Create a revised version of this asset."}
        </p>
      </div>

      <textarea
        value={instructions}
        onChange={(event) => setInstructions(event.target.value)}
        className="min-h-28 w-full rounded-lg border px-3 py-2 text-sm"
        placeholder="Example: Make this more direct, add a stronger CTA, and make it sound less generic."
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating Revision..." : "Create Revised Version"}
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setMessage(null);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Cancel
        </button>
      </div>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </form>
  );
}
