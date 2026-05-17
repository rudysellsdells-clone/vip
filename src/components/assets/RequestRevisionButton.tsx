"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

type RequestRevisionButtonProps = {
  assetId: string;
  assetTitle?: string | null;
};

export function RequestRevisionButton({
  assetId,
  assetTitle,
}: RequestRevisionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!instructions.trim()) {
      setError("Please enter revision instructions.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/revise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instructions,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create revision.");
      }

      setMessage("Revision created and moved to review.");
      setInstructions("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={formStyles.secondaryButton}
      >
        Request Revision
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={formStyles.compactForm}>
      <div className={formStyles.header}>
        <h4 className={formStyles.smallTitle}>Request revision</h4>
        <p className={formStyles.description}>
          {assetTitle ? `Revise: ${assetTitle}` : "Create a revised version of this asset."}
        </p>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Revision instructions</span>
        <textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          className={formStyles.textarea}
          placeholder="Example: Make this more direct, add a stronger CTA, and make it sound less generic."
        />
      </label>

      <div className={formStyles.actions}>
        <button type="submit" disabled={loading} className={formStyles.submit}>
          {loading ? "Creating..." : "Create Revised Version"}
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setMessage(null);
          }}
          className={formStyles.secondaryButton}
        >
          Cancel
        </button>
      </div>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </form>
  );
}
