"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = {
  id: string;
  name: string;
};

const OPPORTUNITY_TYPES = ["project", "retainer", "audit", "consulting", "hybrid"] as const;

const OPPORTUNITY_STAGES = [
  "new",
  "qualified",
  "discovery_scheduled",
  "proposal_needed",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "paused",
] as const;

export function OpportunityForm({
  prospects,
  serviceLines,
  offers,
}: {
  prospects: Option[];
  serviceLines: Option[];
  offers: Option[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const estimatedValueRaw = String(formData.get("estimated_value") ?? "").trim();

      const response = await fetch("/api/opportunities", {
        method: "POST",
        body: JSON.stringify({
          prospect_id: formData.get("prospect_id") || null,
          name: formData.get("name"),
          service_line_id: formData.get("service_line_id") || null,
          offer_id: formData.get("offer_id") || null,
          opportunity_type: formData.get("opportunity_type"),
          estimated_value: estimatedValueRaw ? Number(estimatedValueRaw) : null,
          stage: formData.get("stage"),
          next_step: formData.get("next_step"),
          close_date: formData.get("close_date") || null,
          notes: formData.get("notes"),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create opportunity.");
      }

      setMessage("Opportunity created.");
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
        <h2 className="text-xl font-semibold">Add Opportunity</h2>
        <p className="mt-1 text-sm text-slate-500">
          Track potential projects, retainers, audits, and consulting deals.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Opportunity Name</span>
        <input name="name" className="mt-1 w-full rounded-xl border px-3 py-2" required />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Prospect</span>
          <select name="prospect_id" className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">No prospect selected</option>
            {prospects.map((prospect) => (
              <option key={prospect.id} value={prospect.id}>
                {prospect.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Service Line</span>
          <select name="service_line_id" className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">No service line selected</option>
            {serviceLines.map((serviceLine) => (
              <option key={serviceLine.id} value={serviceLine.id}>
                {serviceLine.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Offer</span>
          <select name="offer_id" className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">No offer selected</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Type</span>
          <select name="opportunity_type" defaultValue="project" className="mt-1 w-full rounded-xl border px-3 py-2">
            {OPPORTUNITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Stage</span>
          <select name="stage" defaultValue="new" className="mt-1 w-full rounded-xl border px-3 py-2">
            {OPPORTUNITY_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Estimated Value</span>
          <input name="estimated_value" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Close Date</span>
          <input name="close_date" type="date" className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Next Step</span>
        <input name="next_step" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Schedule discovery call..." />
      </label>

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
          {saving ? "Saving..." : "Create Opportunity"}
        </button>

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </form>
  );
}
