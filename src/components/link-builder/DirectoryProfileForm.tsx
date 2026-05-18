"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function DirectoryProfileForm({ profile }: { profile?: Record<string, any> | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/link-builder/profile", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to save directory profile.");
      setMessage("Directory profile saved.");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error."); }
    finally { setSaving(false); }
  }

  return (
    <form action={handleSubmit} className={formStyles.form}>
      <input type="hidden" name="id" defaultValue={profile?.id ?? ""} />
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Directory listing profile</h2>
        <p className={formStyles.description}>Reusable business profile for legitimate directory submissions.</p>
      </div>
      <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}><span className={formStyles.label}>Profile Name</span><input name="profile_name" defaultValue={profile?.profile_name ?? "Web Search Pros Directory Profile"} className={formStyles.input} /></label>
        <label className={formStyles.field}><span className={formStyles.label}>Business Name</span><input name="business_name" defaultValue={profile?.business_name ?? "Web Search Pros"} className={formStyles.input} required /></label>
      </div>
      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}><span className={formStyles.label}>Website URL</span><input name="website_url" defaultValue={profile?.website_url ?? "https://web-search-pros.com"} className={formStyles.input} required /></label>
        <label className={formStyles.field}><span className={formStyles.label}>Email</span><input name="business_email" defaultValue={profile?.business_email ?? ""} className={formStyles.input} /></label>
        <label className={formStyles.field}><span className={formStyles.label}>Phone</span><input name="phone" defaultValue={profile?.phone ?? ""} className={formStyles.input} /></label>
      </div>
      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}><span className={formStyles.label}>Service Area</span><input name="service_area" defaultValue={profile?.service_area ?? ""} className={formStyles.input} /></label>
        <label className={formStyles.field}><span className={formStyles.label}>Logo URL</span><input name="logo_url" defaultValue={profile?.logo_url ?? ""} className={formStyles.input} /></label>
      </div>
      <div className={formStyles.row}><label className={formStyles.field}><span className={formStyles.label}>Short Description</span><textarea name="short_description" defaultValue={profile?.short_description ?? ""} className={formStyles.textarea} /></label></div>
      <div className={formStyles.row}><label className={formStyles.field}><span className={formStyles.label}>Long Description</span><textarea name="long_description" defaultValue={profile?.long_description ?? ""} className={[formStyles.textarea, formStyles.textareaLarge].join(" ")} /></label></div>
      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}><span className={formStyles.label}>Categories</span><textarea name="categories" defaultValue={(profile?.categories ?? []).join("\n")} className={formStyles.textarea} /></label>
        <label className={formStyles.field}><span className={formStyles.label}>Services</span><textarea name="services" defaultValue={(profile?.services ?? []).join("\n")} className={formStyles.textarea} /></label>
        <label className={formStyles.field}><span className={formStyles.label}>Anchor Text Options</span><textarea name="anchor_text_options" defaultValue={(profile?.anchor_text_options ?? []).join("\n")} className={formStyles.textarea} /></label>
      </div>
      <div className={formStyles.actions}><button type="submit" disabled={saving} className={formStyles.submit}>{saving ? "Saving..." : "Save Directory Profile"}</button>{message ? <p className={formStyles.message}>{message}</p> : null}{error ? <p className={formStyles.error}>{error}</p> : null}</div>
    </form>
  );
}
