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
      return "Execute LinkedIn";
    case "facebook_post":
      return "Execute Facebook";
    case "email":
      return "Create Gmail Draft";
    case "video_script":
    case "galaxyai_prompt":
      return "Prepare GalaxyAI";
    case "galaxyai_image_prompt":
      return "Prepare GalaxyAI Image";
    case "blog_post":
      return "Create WordPress Draft";
    default:
      return "Execute Asset";
  }
}

function confirmText(assetType: string) {
  if (assetType === "blog_post") {
    return "Send this approved blog post to WordPress through Zapier? The recommended first step is creating a WordPress draft.";
  }

  if (assetType === "galaxyai_image_prompt") {
    return "Prepare this approved image prompt for GalaxyAI? This will not publish the social post yet.";
  }

  if (assetType === "galaxyai_prompt") {
    return "Prepare this approved GalaxyAI prompt? This will not publish the generated media yet.";
  }

  return "Execute this approved asset now? This should only be used when the asset is due according to its publishing schedule.";
}

export function ExecuteApprovedAssetButton({
  assetId,
  assetType,
  disabled = false,
  disabledReason,
}: {
  assetId: string;
  assetType: string;
  disabled?: boolean;
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function executeAsset() {
    if (disabled) {
      setError(disabledReason ?? "This asset is not ready to execute.");
      return;
    }

    if (needsRecipient(assetType) && !recipientEmail.trim()) {
      setError("Recipient email is required for Gmail drafts.");
      return;
    }

    const confirmed = window.confirm(confirmText(assetType));

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();

      if (recipientEmail.trim()) {
        formData.set("recipient_email", recipientEmail.trim());
      }

      const response = await fetch(`/api/publishing/assets/${assetId}/execute`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to execute approved asset.");
      }

      if (result.duplicatePrevented) {
        setMessage(result.message ?? "Duplicate execution prevented.");
      } else if (result.preparedOnly) {
        setMessage("Asset prepared for the next provider step.");
      } else if (assetType === "blog_post") {
        setMessage("WordPress draft request completed.");
      } else {
        setMessage("Asset execution completed.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected execution error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-2">
      {needsRecipient(assetType) ? (
        <input
          value={recipientEmail}
          onChange={(event) => setRecipientEmail(event.target.value)}
          placeholder="Recipient email"
          className={formStyles.input}
          type="email"
          disabled={disabled || running}
        />
      ) : null}

      <button
        type="button"
        onClick={executeAsset}
        disabled={running || disabled}
        className={formStyles.submit}
        title={disabledReason ?? undefined}
      >
        {running ? "Working..." : buttonLabel(assetType)}
      </button>

      {disabled && disabledReason ? (
        <p className={formStyles.description}>{disabledReason}</p>
      ) : null}

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
