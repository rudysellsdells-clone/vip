"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PROSPECT_STATUSES = [
  "new",
  "researching",
  "contacted",
  "qualified",
  "unqualified",
  "active_opportunity",
  "customer",
  "archived",
] as const;

export function ProspectForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/prospects", {
        method: "POST",
        body: JSON.stringify({
          company_name: formData.get("company_name"),
          contact_name: formData.get("contact_name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          website: formData.get("website"),
          industry: formData.get("industry"),
          buyer_segment: formData.get("buyer_segment"),
          source: formData.get("source"),
          notes: formData.get("notes"),
          status: formData.get("status"),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create prospect.");
      }

      setMessage("Prospect created.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Add Prospect</h2>
        <p className="mt-1 text-sm text-slate-500">
          Track companies and contacts that could become projects or retainers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Company Name</span>
          <input name="company_name" className="mt-1 w-full rounded-xl border px-3 py-2" required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Contact Name</span>
          <input name="contact_name" className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input name="email" type="email" className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Phone</span>
          <input name="phone" className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Website</span>
          <input name="website" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="https://..." />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Industry</span>
          <input name="industry" className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Buyer Segment</span>
          <input name="buyer_segment" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Contractors" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Source</span>
          <input name="source" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Campaign, referral, search..." />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select name="status" defaultValue="new" className="mt-1 w-full rounded-xl border px-3 py-2">
            {PROSPECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Notes</span>
        <textarea name="notes" className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2" />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Create Prospect"}
        </button>

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </form>
  );
}
