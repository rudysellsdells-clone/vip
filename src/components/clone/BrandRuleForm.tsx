"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function BrandRuleForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/brand-rules", {
        method: "POST",
        body: JSON.stringify({
          category: formData.get("category"),
          rule_text: formData.get("rule_text"),
          priority: Number(formData.get("priority") ?? 1),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save brand rule.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className={formStyles.compactForm}>
      <div className={formStyles.header}>
        <h3 className={formStyles.smallTitle}>Add brand rule</h3>
        <p className={formStyles.description}>
          Add one clear behavior rule for tone, positioning, safety, or approval.
        </p>
      </div>

      <div className={[formStyles.grid, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Category</span>
          <input name="category" defaultValue="voice" className={formStyles.input} required />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Priority</span>
          <input name="priority" type="number" defaultValue={1} className={formStyles.input} required />
        </label>

        <div className={formStyles.actions} style={{ marginTop: 0 }}>
          <button type="submit" disabled={saving} className={formStyles.submit}>
            {saving ? "Saving..." : "Add Rule"}
          </button>
        </div>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Rule</span>
          <textarea
            name="rule_text"
            placeholder="Example: Keep calls-to-action specific and tied to revenue outcomes."
            className={[formStyles.textarea, formStyles.textareaSmall].join(" ")}
            required
          />
        </label>
      </div>

      {error ? <p className={formStyles.error}>{error}</p> : null}
    </form>
  );
}
