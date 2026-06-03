"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  message: string;
  tone: "idle" | "success" | "error";
};

export function CreateAccountForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({ message: "", tone: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setState({ message: "Creating account...", tone: "idle" });

    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        ownerName: formData.get("ownerName"),
        ownerEmail: formData.get("ownerEmail"),
        websiteUrl: formData.get("websiteUrl"),
        primaryCta: formData.get("primaryCta"),
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setState({ message: result.error ?? "Unable to create account.", tone: "error" });
      return;
    }

    form.reset();
    setState({
      message: result.invite?.message
        ? `Account created. ${result.invite.message}`
        : "Account created.",
      tone: "success",
    });

    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-semibold text-slate-800" htmlFor="account-name">
          Account / client name
        </label>
        <input
          id="account-name"
          name="name"
          required
          placeholder="Example: ABC Roofing"
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="owner-name">
            Account owner name
          </label>
          <input
            id="owner-name"
            name="ownerName"
            placeholder="Client owner or primary contact"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="owner-email">
            Account owner email
          </label>
          <input
            id="owner-email"
            name="ownerEmail"
            type="email"
            required
            placeholder="owner@example.com"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="website-url">
            Website
          </label>
          <input
            id="website-url"
            name="websiteUrl"
            placeholder="https://example.com"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800" htmlFor="primary-cta">
            Primary CTA
          </label>
          <input
            id="primary-cta"
            name="primaryCta"
            placeholder="Schedule a consultation"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          VIP will create a separate account workspace and add you as the managing owner. If the owner email is different, VIP records a pending owner invite.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating..." : "Create Account"}
        </button>
      </div>

      {state.message ? (
        <p className={state.tone === "error" ? "text-sm font-medium text-red-700" : "text-sm font-medium text-emerald-700"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
