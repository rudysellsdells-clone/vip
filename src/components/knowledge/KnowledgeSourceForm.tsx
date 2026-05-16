"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KNOWLEDGE_SOURCE_TYPES } from "@/lib/clone/defaults";

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
    <form action={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Add Knowledge Source</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add website copy, service pages, scripts, case studies, testimonials, or notes that VIP should use as business memory.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input name="title" className="mt-1 w-full rounded-xl border px-3 py-2" required />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Source Type</span>
          <select name="source_type" className="mt-1 w-full rounded-xl border px-3 py-2" required>
            {KNOWLEDGE_SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Source URL</span>
        <input name="source_url" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="https://..." />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Summary</span>
        <textarea name="summary" className="mt-1 min-h-20 w-full rounded-xl border px-3 py-2" />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Content</span>
        <textarea name="content" className="mt-1 min-h-44 w-full rounded-xl border px-3 py-2" required />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Tags</span>
        <input name="tags" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="seo, contractors, case study" />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Add Knowledge Source"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
