"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <form action={handleSubmit} className="space-y-3 rounded-xl border bg-slate-50 p-4">
      <h3 className="font-semibold">Add Brand Rule</h3>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          name="category"
          defaultValue="voice"
          placeholder="Category"
          className="rounded-lg border px-3 py-2 text-sm"
          required
        />
        <input
          name="priority"
          type="number"
          defaultValue={1}
          className="rounded-lg border px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add Rule"}
        </button>
      </div>

      <textarea
        name="rule_text"
        placeholder="Example: Keep calls-to-action specific and tied to revenue outcomes."
        className="min-h-20 w-full rounded-lg border px-3 py-2 text-sm"
        required
      />

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </form>
  );
}
