"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  accountCompactInputClass,
  accountCompactLabelClass,
} from "@/components/accounts/accountFormClasses";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "reviewer", label: "Reviewer" },
  { value: "viewer", label: "Viewer" },
  { value: "owner", label: "Owner" },
];

export function InviteAccountMemberForm({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setMessage("Adding member...");
    setError("");

    const response = await fetch(`/api/accounts/${accountId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        fullName: formData.get("fullName"),
        role: formData.get("role"),
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage("");
      setError(result.error ?? "Unable to add member.");
      return;
    }

    form.reset();
    setMessage(result.invite?.message ? `Member added. ${result.invite.message}` : "Member added.");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid max-w-4xl gap-x-4 gap-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(220px,320px)_minmax(180px,280px)_180px_auto] md:items-end">
      <div>
        <label className={accountCompactLabelClass} htmlFor={`member-email-${accountId}`}>
          Email
        </label>
        <input
          id={`member-email-${accountId}`}
          name="email"
          type="email"
          required
          placeholder="teammate@example.com"
          className={accountCompactInputClass}
        />
      </div>
      <div>
        <label className={accountCompactLabelClass} htmlFor={`member-name-${accountId}`}>
          Name
        </label>
        <input
          id={`member-name-${accountId}`}
          name="fullName"
          placeholder="Optional"
          className={accountCompactInputClass}
        />
      </div>
      <div>
        <label className={accountCompactLabelClass} htmlFor={`member-role-${accountId}`}>
          Role
        </label>
        <select
          id={`member-role-${accountId}`}
          name="role"
          defaultValue="reviewer"
          className={accountCompactInputClass}
        >
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Adding..." : "Add"}
      </button>
      {message ? <p className="md:col-span-4 text-sm font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="md:col-span-4 text-sm font-medium text-red-700">{error}</p> : null}
    </form>
  );
}
