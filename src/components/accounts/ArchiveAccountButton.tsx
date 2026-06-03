"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ArchiveAccountButton({
  accountId,
  accountName,
}: {
  accountId: string;
  accountName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function onArchive() {
    setError("");

    const confirmed = window.confirm(
      `Remove ${accountName} from active VIP accounts? This archives the account and preserves its history.`,
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/accounts/${accountId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Removed by account manager from VIP accounts page." }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Unable to remove account.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onArchive}
        disabled={isPending}
        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Removing..." : "Remove Account"}
      </button>
      {error ? <p className="max-w-sm text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
