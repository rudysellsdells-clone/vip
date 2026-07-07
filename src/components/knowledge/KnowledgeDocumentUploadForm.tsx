"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function KnowledgeDocumentUploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setSaving(true);
    setError(null);
    setMessage("Uploading and reading document...");

    try {
      const response = await fetch("/api/knowledge-sources/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to upload knowledge document.");
      }

      setMessage(`Saved ${result.title ?? "knowledge document"} as brand learning.`);
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : "Unexpected error uploading document.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={formStyles.form} encType="multipart/form-data">
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Upload brand learning document</h2>
        <p className={formStyles.description}>
          Upload a PDF, Word DOCX, or text file. VIP will extract the text and save it as account-specific knowledge for future campaign generation.
        </p>
      </div>

      <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Document title</span>
          <input name="title" className={formStyles.input} placeholder="Brand guide, sales deck, service brochure..." />
          <span className={formStyles.help}>Leave blank to use the file name.</span>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Document</span>
          <input
            type="file"
            name="document"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className={formStyles.input}
            required
          />
          <span className={formStyles.help}>Maximum size: 20MB.</span>
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Summary / instructions</span>
          <textarea
            name="summary"
            className={[formStyles.textarea, formStyles.textareaSmall].join(" ")}
            placeholder="Optional: Explain what VIP should learn from this document."
          />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Tags</span>
          <input name="tags" className={formStyles.input} placeholder="brand guide, proof, services, sales" />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={saving} className={formStyles.submit}>
          {saving ? "Uploading..." : "Upload & Save Knowledge"}
        </button>
        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
