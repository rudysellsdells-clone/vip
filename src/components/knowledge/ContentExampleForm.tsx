"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONTENT_EXAMPLE_TYPES } from "@/lib/clone/defaults";
import formStyles from "@/components/forms/VipForm.module.css";

export function ContentExampleForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/content-examples", {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title"),
          source: formData.get("source"),
          content: formData.get("content"),
          content_type: formData.get("content_type"),
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
        throw new Error(result.error ?? "Unable to save content example.");
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
        <h2 className={formStyles.title}>Add content example</h2>
        <p className={formStyles.description}>
          Add approved emails, posts, scripts, sales copy, or other examples that show VIP how Rudy should sound.
        </p>
      </div>

      <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Title</span>
          <input name="title" className={formStyles.input} required />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Content Type</span>
          <select name="content_type" className={formStyles.select} required>
            {CONTENT_EXAMPLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Source</span>
          <input name="source" className={formStyles.input} placeholder="Website, email, LinkedIn, proposal..." />
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
          <input name="tags" className={formStyles.input} placeholder="email, local seo, contractors" />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={saving} className={formStyles.submit}>
          {saving ? "Saving..." : "Add Content Example"}
        </button>
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
