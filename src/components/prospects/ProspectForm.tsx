"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

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
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Add prospect</h2>
        <p className={formStyles.description}>
          Track companies and contacts that could become projects or retainers.
        </p>
      </div>

      <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Company Name</span>
          <input name="company_name" className={formStyles.input} required />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Contact Name</span>
          <input name="contact_name" className={formStyles.input} />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Email</span>
          <input name="email" type="email" className={formStyles.input} />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Phone</span>
          <input name="phone" className={formStyles.input} />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Website</span>
          <input name="website" className={formStyles.input} placeholder="https://..." />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid4].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Industry</span>
          <input name="industry" className={formStyles.input} />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Buyer Segment</span>
          <input name="buyer_segment" className={formStyles.input} placeholder="Contractors" />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Source</span>
          <input name="source" className={formStyles.input} placeholder="Campaign, referral, search..." />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Status</span>
          <select name="status" defaultValue="new" className={formStyles.select}>
            {PROSPECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
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
          {saving ? "Saving..." : "Create Prospect"}
        </button>
        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
