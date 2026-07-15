"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

function readableError(value: unknown, fallback = "Unexpected error.") {
  if (value instanceof Error) return value.message || fallback;
  if (typeof value === "string") return value || fallback;

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const message =
      objectValue.error ??
      objectValue.message ??
      objectValue.details ??
      objectValue.detail ??
      objectValue.hint;

    if (typeof message === "string") return message;

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

type AttributionPreview = {
  ready?: boolean;
  reason?: string | null;
  destinationUrl?: string | null;
  trackedUrl?: string | null;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string | null;
  vipCampaign?: string | null;
  vipAsset?: string;
  appendedToContent?: boolean;
};

type SendAssetToZapierMcpButtonProps = {
  assetId: string;
  label?: string;
};

export function SendAssetToZapierMcpButton({
  assetId,
  label = "Send to ZapierMCP",
}: SendAssetToZapierMcpButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(true);
  const [preview, setPreview] = useState<AttributionPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      try {
        const response = await fetch(
          `/api/publishing/assets/${assetId}/execute-zapier-mcp`,
          { method: "GET", cache: "no-store" },
        );
        const payload = (await readResponse(response)) as Record<string, unknown>;
        if (!active) return;
        if (response.ok && payload.attribution && typeof payload.attribution === "object") {
          setPreview(payload.attribution as AttributionPreview);
        }
      } catch {
        // Attribution preview is helpful but must not make the existing publishing control unusable.
      } finally {
        if (active) setPreviewBusy(false);
      }
    }

    loadPreview();
    return () => {
      active = false;
    };
  }, [assetId]);

  async function send() {
    setSending(true);
    setMessage(null);
    setError(null);
    setDetails(null);

    try {
      const response = await fetch(`/api/publishing/assets/${assetId}/execute-zapier-mcp`, {
        method: "POST",
      });

      const payload = await readResponse(response);
      setDetails(payload as Record<string, unknown>);

      if (!response.ok) {
        throw new Error(readableError(payload, "Unable to send asset to ZapierMCP."));
      }

      setMessage(
        "Publishing action sent. VIP recorded the attributed payload and will refresh the queue after the provider response is recorded.",
      );
      router.refresh();
    } catch (err) {
      setError(readableError(err, "Unable to send asset to ZapierMCP."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={formStyles.form}>
      {previewBusy ? (
        <p className={websiteStyles.cardMeta}>Preparing the Marketing VIP attribution preview…</p>
      ) : preview?.ready && preview.trackedUrl ? (
        <article className={websiteStyles.card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={websiteStyles.cardTitle}>Tracked campaign link ready</h3>
            <span className={websiteStyles.badge}>H1.7C2</span>
          </div>
          <p className={websiteStyles.cardMeta}>
            {preview.utmSource} / {preview.utmMedium} · {preview.utmCampaign} · {preview.utmContent}
            {preview.utmTerm ? ` · ${preview.utmTerm}` : ""}
          </p>
          <p className="mt-3 break-all font-mono text-xs text-slate-600">
            {preview.trackedUrl}
          </p>
          <p className={websiteStyles.cardMeta} style={{ marginTop: 10 }}>
            {preview.appendedToContent
              ? "VIP will append this URL to the outbound content."
              : "VIP will replace the destination URL in the outbound payload or provide it as the canonical link field."}
          </p>
        </article>
      ) : preview?.reason ? (
        <article className={websiteStyles.card}>
          <h3 className={websiteStyles.cardTitle}>Attribution needs a destination URL</h3>
          <p className={websiteStyles.cardText}>{preview.reason}</p>
          <p className={websiteStyles.cardMeta}>
            Publishing remains available, but this asset will not receive campaign-link attribution until a valid landing page or booking URL is available.
          </p>
        </article>
      ) : null}

      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className={formStyles.submit}
        >
          {sending ? "Sending..." : label}
        </button>
      </div>

      {message ? <p className={websiteStyles.cardMeta}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}

      {details ? (
        <details className={websiteStyles.card}>
          <summary className={websiteStyles.cardTitle}>Execution details</summary>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 12, fontSize: 12 }}>
            {JSON.stringify(details, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
