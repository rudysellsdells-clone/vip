"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function UseAccountWorkspaceButton({
  accountId,
  accountName,
  className,
  label = "Use Workspace",
  redirectHref,
}: {
  accountId: string;
  accountName: string;
  className?: string;
  label?: string;
  redirectHref?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function useWorkspace() {
    setMessage("");
    setError("");

    const response = await fetch("/api/accounts/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Unable to switch workspace.");
      return;
    }

    setMessage(`Now using ${result.accountName ?? accountName}.`);
    startTransition(() => {
      if (redirectHref) {
        router.push(redirectHref);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        className={className}
        onClick={useWorkspace}
        disabled={isPending}
      >
        {isPending ? "Switching..." : label}
      </button>
      {message ? <p className="text-xs font-semibold text-green-700">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
