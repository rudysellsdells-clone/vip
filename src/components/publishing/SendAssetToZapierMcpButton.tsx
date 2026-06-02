"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

export function SendAssetToZapierMcpButton({
  assetId,
}: {
  assetId: string;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);

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

      setMessage("Sent to ZapierMCP. This asset should now leave the active publishing queue.");
      router.refresh();
    } catch (err) {
      setError(readableError(err, "Unable to send asset to ZapierMCP."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.actions}>
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className={formStyles.submit}
        >
          {sending ? "Sending to ZapierMCP..." : "Send to ZapierMCP"}
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
