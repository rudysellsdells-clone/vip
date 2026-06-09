"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

function readableError(value: unknown, fallback = "Unexpected error.") {
  if (value instanceof Error) return value.message || fallback;
  if (typeof value === "string") return value || fallback;

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, any>;
    return objectValue.error ?? objectValue.message ?? JSON.stringify(value);
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

export function PublishingScheduleActions({
  assetId,
  initialDate = "",
}: {
  assetId: string;
  initialDate?: string | null;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [showDateEditor, setShowDateEditor] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(
    initialDate ? String(initialDate).slice(0, 16) : ""
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function publishViaZapierMcp() {
    setSending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/publishing/assets/${assetId}/execute-zapier-mcp`, {
        method: "POST",
      });

      const payload = await readResponse(response);

      if (!response.ok) {
        throw new Error(readableError(payload, "Unable to publish via ZapierMCP."));
      }

      setMessage("ZapierMCP execution completed. Social posts should publish; email assets should create a Gmail draft.");
      router.refresh();
    } catch (err) {
      setError(readableError(err, "Unable to publish via ZapierMCP."));
    } finally {
      setSending(false);
    }
  }

  async function saveDate() {
    setScheduling(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/publishing/assets/${assetId}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledPublishAt: scheduledAt,
        }),
      });

      const payload = await readResponse(response);

      if (!response.ok) {
        throw new Error(readableError(payload, "Unable to schedule asset."));
      }

      setMessage("Publish date saved.");
      setShowDateEditor(false);
      router.refresh();
    } catch (err) {
      setError(readableError(err, "Unable to schedule asset."));
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div className={websiteStyles.actionRow}>
        <a href={`/assets/${assetId}/view`} className={websiteStyles.link}>
          Open →
        </a>

        <a href={`/publishing-ready?asset=${assetId}`} className={websiteStyles.link}>
          Review payload →
        </a>

        <button
          type="button"
          onClick={publishViaZapierMcp}
          disabled={sending}
          className={formStyles.secondaryButton}
        >
          {sending ? "Publishing..." : "Publish via ZapierMCP"}
        </button>

        <button
          type="button"
          onClick={() => setShowDateEditor((value) => !value)}
          className={formStyles.secondaryButton}
        >
          {showDateEditor ? "Close date" : "Add/Edit Date"}
        </button>
      </div>

      {showDateEditor ? (
        <div className={formStyles.form} style={{ marginTop: 12 }}>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Scheduled publish date/time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className={formStyles.input}
            />
          </label>

          <div className={formStyles.actions}>
            <button
              type="button"
              onClick={saveDate}
              disabled={scheduling || !scheduledAt}
              className={formStyles.submit}
            >
              {scheduling ? "Saving..." : "Save Date"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className={websiteStyles.cardMeta}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
