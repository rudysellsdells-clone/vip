"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AccountContextAccount } from "@/lib/accounts/account-context";

export function AccountSwitcher({
  accounts,
  activeAccountId,
  isMaster = false,
}: {
  accounts: AccountContextAccount[];
  activeAccountId: string | null;
  isMaster?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const accountId = event.target.value;
    setError("");
    setMessage("");

    if (!accountId) {
      return;
    }

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

    setMessage(`Using ${result.accountName ?? "selected workspace"}.`);
    startTransition(() => router.refresh());
  }

  if (!accounts.length) {
    return (
      <Link href="/accounts" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700">
        Add account
      </Link>
    );
  }

  return (
    <div className="grid gap-1">
      <label className="sr-only" htmlFor="vip-active-account">
        Active workspace
      </label>
      <select
        id="vip-active-account"
        value={activeAccountId ?? ""}
        onChange={onChange}
        disabled={isPending}
        className="min-h-10 max-w-[230px] rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm outline-none hover:border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        title={isMaster ? "Choose which workspace VIP should use for account-scoped workflows." : "Choose your active workspace."}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
      {isMaster ? (
        <p className="max-w-[230px] text-right text-[0.68rem] font-semibold text-slate-500">
          MASTER workspace selector
        </p>
      ) : null}
      {message ? <p className="max-w-[230px] text-xs font-semibold text-green-700">{message}</p> : null}
      {error ? <p className="max-w-[230px] text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}