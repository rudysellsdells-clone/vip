"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

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
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Add opportunity</h2>
        <p className={formStyles.description}>
          Track potential projects, retainers, audits, and consulting deals.
        </p>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Opportunity Name</span>
        <input name="name" className={formStyles.input} required />
      </label>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Prospect</span>
          <select name="prospect_id" className={formStyles.select}>
            <option value="">No prospect selected</option>
            {prospects.map((prospect) => (
              <option key={prospect.id} value={prospect.id}>
                {prospect.name}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Service Line</span>
          <select name="service_line_id" className={formStyles.select}>
            <option value="">No service line selected</option>
            {serviceLines.map((serviceLine) => (
              <option key={serviceLine.id} value={serviceLine.id}>
                {serviceLine.name}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Offer</span>
          <select name="offer_id" className={formStyles.select}>
            <option value="">No offer selected</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid4].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Type</span>
          <select name="opportunity_type" defaultValue="project" className={formStyles.select}>
            {OPPORTUNITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Stage</span>
          <select name="stage" defaultValue="new" className={formStyles.select}>
            {OPPORTUNITY_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Estimated Value</span>
          <input name="estimated_value" type="number" min="0" step="0.01" className={formStyles.input} />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Close Date</span>
          <input name="close_date" type="date" className={formStyles.input} />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Next Step</span>
          <input name="next_step" className={formStyles.input} placeholder="Schedule discovery call..." />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Notes</span>
          <textarea name="notes" className={formStyles.textarea} />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={saving} className={formStyles.submit}>
          {saving ? "Saving..." : "Create Opportunity"}
        </button>
        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
