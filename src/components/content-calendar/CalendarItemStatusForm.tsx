"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

const STATUSES = [
  "planned",
  "generated",
  "needs_review",
  "approved",
  "scheduled",
  "published",
  "skipped",
];

export function CalendarItemStatusForm({
  itemId,
  currentStatus,
}: {
  itemId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(currentStatus);

  async function handleSubmit(formData: FormData) {
    setSaving(true);

    try {
      const response = await fetch(`/api/content-calendar/items/${itemId}/status`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update status.");
      }

      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className={formStyles.inlineForm}>
      <select
        name="status"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className={formStyles.select}
      >
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>

      <button type="submit" disabled={saving} className={formStyles.secondaryButton}>
        {saving ? "Saving..." : "Update"}
      </button>
    </form>
  );
}
