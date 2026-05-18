"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function BacklinkVerifyForm({ targetUrl = "https://web-search-pros.com" }: { targetUrl?: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setChecking(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/link-builder/backlinks/verify", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to verify backlink.");
      setMessage(result.verification?.found ? "Backlink found and recorded." : "Record created, but the link was not found automatically.");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error."); }
    finally { setChecking(false); }
  }

  return <form action={handleSubmit} className={formStyles.form}>
    <div className={formStyles.header}><h2 className={formStyles.title}>Verify backlink</h2><p className={formStyles.description}>Enter the live listing page and VIP checks whether it links to your target URL.</p></div>
    <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
      <label className={formStyles.field}><span className={formStyles.label}>Source Listing URL</span><input name="source_url" className={formStyles.input} required /></label>
      <label className={formStyles.field}><span className={formStyles.label}>Target URL</span><input name="target_url" defaultValue={targetUrl} className={formStyles.input} required /></label>
    </div>
    <div className={formStyles.row}><label className={formStyles.field}><span className={formStyles.label}>Notes</span><textarea name="notes" className={formStyles.textarea} /></label></div>
    <div className={formStyles.actions}><button type="submit" disabled={checking} className={formStyles.submit}>{checking ? "Checking..." : "Verify Backlink"}</button>{message ? <p className={formStyles.message}>{message}</p> : null}{error ? <p className={formStyles.error}>{error}</p> : null}</div>
  </form>;
}
