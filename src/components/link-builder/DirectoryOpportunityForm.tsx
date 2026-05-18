"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

const TYPES = ["general", "local", "industry", "association", "partner", "vendor", "resource", "citation", "other"];

export function DirectoryOpportunityForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/link-builder/opportunities", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to add directory opportunity.");
      setMessage("Directory opportunity added.");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error."); }
    finally { setSaving(false); }
  }

  return (
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}><h2 className={formStyles.title}>Add directory opportunity</h2><p className={formStyles.description}>Add a relevant directory, citation site, association page, or resource page for review.</p></div>
      <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}><span className={formStyles.label}>Directory URL</span><input name="url" className={formStyles.input} placeholder="https://example.com" required /></label>
        <label className={formStyles.field}><span className={formStyles.label}>Submit URL</span><input name="submit_url" className={formStyles.input} placeholder="https://example.com/add-listing" /></label>
      </div>
      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}><span className={formStyles.label}>Directory Name</span><input name="directory_name" className={formStyles.input} /></label>
        <label className={formStyles.field}><span className={formStyles.label}>Type</span><select name="directory_type" className={formStyles.select}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        <label className={formStyles.field}><span className={formStyles.label}>Category</span><input name="category" className={formStyles.input} placeholder="Marketing Agency" /></label>
      </div>
      <div className={formStyles.row}><label className={formStyles.field}><span className={formStyles.label}>Notes</span><textarea name="notes" className={formStyles.textarea} /></label></div>
      <div className={formStyles.actions}><button type="submit" disabled={saving} className={formStyles.submit}>{saving ? "Adding..." : "Add Opportunity"}</button>{message ? <p className={formStyles.message}>{message}</p> : null}{error ? <p className={formStyles.error}>{error}</p> : null}</div>
    </form>
  );
}
