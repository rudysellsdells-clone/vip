"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DigitalCloneProfileFormProps = {
  profile: {
    id?: string;
    name?: string | null;
    purpose?: string | null;
    voice_summary?: string | null;
    business_summary?: string | null;
    audience_summary?: string | null;
    offer_summary?: string | null;
    sales_outcome_summary?: string | null;
  } | null;
};

export function DigitalCloneProfileForm({ profile }: DigitalCloneProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/digital-clone/profile", {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          purpose: formData.get("purpose"),
          voice_summary: formData.get("voice_summary"),
          business_summary: formData.get("business_summary"),
          audience_summary: formData.get("audience_summary"),
          offer_summary: formData.get("offer_summary"),
          sales_outcome_summary: formData.get("sales_outcome_summary"),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save digital clone profile.");
      }

      setMessage("Digital clone profile saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Digital Clone Profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          This is the core memory VIP uses to understand Rudy&apos;s voice, business, offers, and buyers.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Clone Name</span>
        <input
          name="name"
          defaultValue={profile?.name ?? "Rudy’s Marketing Twin"}
          className="mt-1 w-full rounded-xl border px-3 py-2"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Purpose</span>
        <textarea
          name="purpose"
          defaultValue={profile?.purpose ?? ""}
          className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Voice Summary</span>
        <textarea
          name="voice_summary"
          defaultValue={profile?.voice_summary ?? ""}
          className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Business Summary</span>
        <textarea
          name="business_summary"
          defaultValue={profile?.business_summary ?? ""}
          className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Audience Summary</span>
          <textarea
            name="audience_summary"
            defaultValue={profile?.audience_summary ?? ""}
            className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Offer Summary</span>
          <textarea
            name="offer_summary"
            defaultValue={profile?.offer_summary ?? ""}
            className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Sales Outcome Summary</span>
        <textarea
          name="sales_outcome_summary"
          defaultValue={profile?.sales_outcome_summary ?? ""}
          className="mt-1 min-h-20 w-full rounded-xl border px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Clone Profile"}
        </button>

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </form>
  );
}
