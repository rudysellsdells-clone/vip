"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

function needsRecipient(assetType: string) {
  return assetType === "email";
}

function buttonLabel(assetType: string) {
  switch (assetType) {
    case "linkedin_post":
      return "Run LinkedIn Action";
    case "facebook_post":
      return "Run Facebook Action";
    case "email":
      return "Create Gmail Draft";
    case "video_script":
      return "Prepare GalaxyAI Request";
    default:
      return "Execute";
  }
}

export function ExecuteApprovedAssetButton({
  assetId,
  assetType,
  disabled = false,
}: {
  assetId: string;
  assetType: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExecute() {
    const formData = new FormData();

    if (needsRecipient(assetType)) {
      if (!recipientEmail.trim()) {
        setError("Recipient email is required for Gmail drafts.");
        return;
      }

      formData.set("recipient_email", recipientEmail.trim());
    }

    const confirmed = window.confirm(
      "Execute this approved asset? VIP will record the run and prevent duplicate completed executions for this asset/channel."
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/publishing/assets/${assetId}/execute`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to execute approved asset.");
      }

      if (result.duplicatePrevented) {
        setMessage("Already executed for this channel. No duplicate was created.");
      } else if (result.preparedOnly) {
        setMessage("GalaxyAI media request prepared.");
      } else {
        setMessage("Execution completed and recorded.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected execution error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-3">
      {needsRecipient(assetType) ? (
        <input
          type="email"
          value={recipientEmail}
          onChange={(event) => setRecipientEmail(event.target.value)}
          placeholder="Recipient email"
          className={formStyles.input}
        />
      ) : null}

      <button
        type="button"
        onClick={handleExecute}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Running..." : buttonLabel(assetType)}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
