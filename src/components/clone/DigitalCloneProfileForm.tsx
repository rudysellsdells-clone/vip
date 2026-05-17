"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

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
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Digital clone profile</h2>
        <p className={formStyles.description}>
          This is the core memory VIP uses to understand Rudy&apos;s voice, business, offers, buyers, and sales outcomes.
        </p>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Clone Name</span>
        <input
          name="name"
          defaultValue={profile?.name ?? "Rudy’s Marketing Twin"}
          className={formStyles.input}
          required
        />
      </label>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Purpose</span>
          <textarea
            name="purpose"
            defaultValue={profile?.purpose ?? ""}
            className={formStyles.textarea}
            required
          />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Voice Summary</span>
          <textarea
            name="voice_summary"
            defaultValue={profile?.voice_summary ?? ""}
            className={formStyles.textarea}
          />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Business Summary</span>
          <textarea
            name="business_summary"
            defaultValue={profile?.business_summary ?? ""}
            className={formStyles.textarea}
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Audience Summary</span>
          <textarea
            name="audience_summary"
            defaultValue={profile?.audience_summary ?? ""}
            className={formStyles.textarea}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Offer Summary</span>
          <textarea
            name="offer_summary"
            defaultValue={profile?.offer_summary ?? ""}
            className={formStyles.textarea}
          />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Sales Outcome Summary</span>
          <textarea
            name="sales_outcome_summary"
            defaultValue={profile?.sales_outcome_summary ?? ""}
            className={formStyles.textarea}
          />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={saving} className={formStyles.submit}>
          {saving ? "Saving..." : "Save Clone Profile"}
        </button>
        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
