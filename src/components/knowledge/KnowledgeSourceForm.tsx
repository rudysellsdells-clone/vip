"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KNOWLEDGE_SOURCE_TYPES } from "@/lib/clone/defaults";
import formStyles from "@/components/forms/VipForm.module.css";

export function KnowledgeSourceForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/knowledge-sources", {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title"),
          source_type: formData.get("source_type"),
          source_url: formData.get("source_url"),
          summary: formData.get("summary"),
          content: formData.get("content"),
          tags: String(formData.get("tags") ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save knowledge source.");
      }

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
        <h2 className={formStyles.title}>Add knowledge source</h2>
        <p className={formStyles.description}>
          Add website copy, service pages, scripts, case studies, testimonials, or notes that VIP should use as business memory.
        </p>
      </div>

      <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Title</span>
          <input name="title" className={formStyles.input} required />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Source Type</span>
          <select name="source_type" className={formStyles.select} required>
            {KNOWLEDGE_SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Source URL</span>
          <input name="source_url" className={formStyles.input} placeholder="https://..." />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Summary</span>
          <textarea name="summary" className={[formStyles.textarea, formStyles.textareaSmall].join(" ")} />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Content</span>
          <textarea name="content" className={[formStyles.textarea, formStyles.textareaLarge].join(" ")} required />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Tags</span>
          <input name="tags" className={formStyles.input} placeholder="seo, contractors, case study" />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={saving} className={formStyles.submit}>
          {saving ? "Saving..." : "Add Knowledge Source"}
        </button>
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
