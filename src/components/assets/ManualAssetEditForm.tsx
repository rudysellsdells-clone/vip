"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import formStyles from "@/components/forms/VipForm.module.css";

type ManualAssetEditFormProps = {
  assetId: string;
  initialTitle?: string | null;
  initialContent?: string | null;
  disabled?: boolean;
};

export function ManualAssetEditForm({
  assetId,
  initialTitle,
  initialContent,
  disabled = false,
}: ManualAssetEditFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [content, setContent] = useState(initialContent ?? "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please add a title before saving.");
      return;
    }

    if (!content.trim()) {
      setError("Please add content before saving.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/manual-edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          notes,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save edited version.");
      }

      const editedAssetId = result?.editedAsset?.id;
      setMessage("Edited version saved and moved to review.");
      setNotes("");

      if (editedAssetId) {
        router.push(`/assets/${editedAssetId}`);
        return;
      }

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
        disabled={disabled}
        className={formStyles.secondaryButton}
      >
        Edit Final Copy
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={formStyles.compactForm}>
      <div className={formStyles.header}>
        <h4 className={formStyles.smallTitle}>Edit final copy</h4>
        <p className={formStyles.description}>
          Save a polished version without overwriting the original generated asset. The edited copy becomes a new version that can be reviewed and approved.
        </p>
      </div>

      <label className={formStyles.field}>
        <span className={formStyles.label}>Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={formStyles.input}
          placeholder="Asset title"
        />
      </label>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Content</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className={`${formStyles.textarea} ${formStyles.textareaLarge}`}
            placeholder="Paste or edit the final content here."
          />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Edit notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${formStyles.textarea} ${formStyles.textareaSmall}`}
            placeholder="Optional: note what changed, such as CTA polish, tone cleanup, or proof point updates."
          />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={loading} className={formStyles.submit}>
          {loading ? "Saving..." : "Save Edited Version"}
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle(initialTitle ?? "");
            setContent(initialContent ?? "");
            setNotes("");
            setMessage(null);
            setError(null);
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
