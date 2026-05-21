"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function WhatIfPdfActions({
  assetId,
  latestPdfUrl,
}: {
  assetId: string;
  latestPdfUrl?: string | null;
}) {
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string | null>(latestPdfUrl ?? null);
  const [draftPrepared, setDraftPrepared] = useState(false);
  const [runningPdf, setRunningPdf] = useState(false);
  const [runningDraft, setRunningDraft] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generatePdf() {
    setRunningPdf(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/what-if-pdf/generate`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate PDF.");
      }

      setPdfUrl(result.fileUrl ?? null);
      setMessage("Branded PDF generated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected PDF error.");
    } finally {
      setRunningPdf(false);
    }
  }

  async function prepareGmailDraft() {
    setRunningDraft(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/what-if-pdf/gmail-draft`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to prepare Gmail draft.");
      }

      setDraftPrepared(true);
      setMessage("Gmail draft content prepared with the PDF attachment URL.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected Gmail draft error.");
    } finally {
      setRunningDraft(false);
    }
  }

  return (
    <div className={websiteStyles.actionRow}>
      <button
        type="button"
        onClick={generatePdf}
        disabled={runningPdf}
        className={formStyles.submit}
      >
        {runningPdf ? "Generating PDF..." : pdfUrl ? "Regenerate PDF" : "Generate Branded PDF"}
      </button>

      <button
        type="button"
        onClick={prepareGmailDraft}
        disabled={runningDraft || !pdfUrl}
        className={formStyles.secondaryButton}
      >
        {runningDraft ? "Preparing..." : "Prepare Gmail Draft + PDF"}
      </button>

      {pdfUrl ? (
        <Link href={pdfUrl} className={websiteStyles.link} target="_blank">
          Open PDF →
        </Link>
      ) : null}

      {draftPrepared ? <p className={formStyles.message}>Draft prep saved.</p> : null}
      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
