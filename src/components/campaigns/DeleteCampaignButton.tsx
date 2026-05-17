"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function DeleteCampaignButton({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  async function handleDelete() {
    if (!canDelete) {
      setError("Type DELETE to confirm campaign deletion.");
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/delete`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete campaign.");
      }

      router.push("/campaigns");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={formStyles.secondaryButton}
      >
        Delete Campaign
      </button>
    );
  }

  return (
    <div className={formStyles.compactForm}>
      <div className={formStyles.header}>
        <h3 className={formStyles.smallTitle}>Delete campaign?</h3>
        <p className={formStyles.description}>
          This permanently deletes <strong>{campaignName}</strong> and its generated assets.
          Published external posts, sent emails, and external platform activity are not undone.
        </p>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Type DELETE to confirm</span>
        <input
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          className={formStyles.input}
          placeholder="DELETE"
        />
      </label>

      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={!canDelete || deleting}
          className={formStyles.submit}
        >
          {deleting ? "Deleting..." : "Permanently Delete"}
        </button>

        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setConfirmText("");
            setError(null);
          }}
          className={formStyles.secondaryButton}
        >
          Cancel
        </button>
      </div>

      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
