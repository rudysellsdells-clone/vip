"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RemoveAccountMemberButton({
  accountId,
  membershipId,
  memberLabel,
  disabledReason,
}: {
  accountId: string;
  membershipId: string;
  memberLabel: string;
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function onRemove() {
    if (disabledReason) {
      setError(disabledReason);
      return;
    }

    setError("");

    const confirmed = window.confirm(
      `Remove ${memberLabel} from this account? This removes their seat/access but preserves account history.`,
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/accounts/${accountId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Unable to remove member.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onRemove}
        disabled={isPending || Boolean(disabledReason)}
        title={disabledReason || "Remove this member from the account"}
        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Removing..." : "Remove"}
      </button>
      {error ? <p className="max-w-[12rem] text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
