"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

export function PrepareFacebookPostButton({
  assetId,
  disabled = false,
}: {
  assetId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePrepare() {
    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/prepare-facebook-post`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to prepare Facebook post.");
      }

      const uploadMessage =
        result.mediaUploadMode === "native_photo_upload"
          ? " Image will upload natively from the GalaxyAI URL."
          : result.mediaUploadMode === "native_video_upload"
            ? " Video will upload natively from the GalaxyAI URL."
            : " No GalaxyAI media was found, so this is text-only.";

      setMessage(`Facebook action prepared for ${result.pageName ?? "the page"}.${uploadMessage}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePrepare}
        disabled={disabled || running}
        className={formStyles.submit}
      >
        {running ? "Preparing..." : "Prepare Facebook Post"}
      </button>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
