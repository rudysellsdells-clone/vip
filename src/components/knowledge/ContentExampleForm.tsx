"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONTENT_EXAMPLE_TYPES } from "@/lib/clone/defaults";

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
          content_type: formData.get("content_type"),
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
    <form action={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Add Content Example</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add examples of Rudy&apos;s writing, campaigns, sales language, or approved style.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input name="title" className="rounded-xl border px-3 py-2" placeholder="Title" required />
        <select name="content_type" className="rounded-xl border px-3 py-2" required>
          {CONTENT_EXAMPLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <input name="source" className="w-full rounded-xl border px-3 py-2" placeholder="Source or context" />

      <textarea name="content" className="min-h-36 w-full rounded-xl border px-3 py-2" placeholder="Paste the example here..." required />

      <input name="tags" className="w-full rounded-xl border px-3 py-2" placeholder="Tags separated by commas" />

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Add Content Example"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
