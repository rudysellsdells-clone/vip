"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function ExecuteGmailDraftWithPdfForm({
  exportId,
  disabled = false,
}: {
  exportId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const toEmail = String(formData.get("to_email") || "").trim();

    if (!toEmail) {
      setError("Recipient email is required.");
      return;
    }

    const confirmed = window.confirm(
      `Create a Gmail draft for ${toEmail} with the branded What-If PDF attached? This will create a draft only and will not send the email.`
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/asset-exports/${exportId}/gmail-draft/execute`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create Gmail draft.");
      }

      setMessage("Gmail draft created through Zapier.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected Gmail execution error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Create Gmail draft with PDF</h3>
        <p className={formStyles.description}>
          Enter the recipient, then VIP will create a Gmail draft through Zapier with the branded PDF attachment URL. It will not send the email.
        </p>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>To Email</span>
          <input
            name="to_email"
            type="email"
            className={formStyles.input}
            placeholder="prospect@example.com"
            required
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>CC</span>
          <input
            name="cc_email"
            type="email"
            className={formStyles.input}
            placeholder="optional"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>BCC</span>
          <input
            name="bcc_email"
            type="email"
            className={formStyles.input}
            placeholder="optional"
          />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button
          type="submit"
          disabled={disabled || running}
          className={formStyles.submit}
        >
          {running ? "Creating Draft..." : "Create Gmail Draft"}
        </button>

        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
