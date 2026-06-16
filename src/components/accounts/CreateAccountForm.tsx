"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import accountStyles from "@/components/accounts/AccountForms.module.css";

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
    <form onSubmit={onSubmit} className={accountStyles.formCard}>
      <div className={accountStyles.formGrid}>
        <label className={accountStyles.field} htmlFor="account-name">
          <span className={accountStyles.label}>Account / client name</span>
          <input
            id="account-name"
            name="name"
            required
            placeholder="Example: ABC Roofing"
            className={accountStyles.input}
          />
        </label>

        <label className={accountStyles.field} htmlFor="owner-name">
          <span className={accountStyles.label}>Account owner name</span>
          <input
            id="owner-name"
            name="ownerName"
            placeholder="Client owner or primary contact"
            className={accountStyles.input}
          />
        </label>

        <label className={accountStyles.field} htmlFor="owner-email">
          <span className={accountStyles.label}>Account owner email</span>
          <input
            id="owner-email"
            name="ownerEmail"
            type="email"
            required
            placeholder="owner@example.com"
            className={accountStyles.input}
          />
        </label>

        <label className={accountStyles.field} htmlFor="website-url">
          <span className={accountStyles.label}>Website</span>
          <input
            id="website-url"
            name="websiteUrl"
            placeholder="https://example.com"
            className={accountStyles.input}
          />
        </label>

        <label className={accountStyles.field} htmlFor="primary-cta">
          <span className={accountStyles.label}>Primary CTA</span>
          <input
            id="primary-cta"
            name="primaryCta"
            placeholder="Schedule a consultation"
            className={accountStyles.input}
          />
        </label>
      </div>

      <div className={accountStyles.buttonRow}>
        <p className={accountStyles.helperText}>
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
