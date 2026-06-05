"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

function canUsePublishingReady(assetType: string) {
  return [
    "linkedin_post",
    "facebook_post",
    "email",
    "video_script",
    "galaxyai_prompt",
    "galaxyai_image_prompt",
  ].includes(assetType);
}

export function ReadyAssetActions({
  assetId,
  assetType,
  status,
}: {
  assetId: string;
  assetType: string;
  status: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approveAsset() {
    const confirmed = window.confirm(
      "Approve this quality-gated asset and move it toward publishing readiness?"
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/approval-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to approve asset.");
      }

      setMessage("Asset approved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected approval error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className={websiteStyles.actionRow}>
        {status !== "approved" ? (
          <button
            type="button"
            onClick={approveAsset}
            disabled={running}
            className={formStyles.submit}
          >
            {running ? "Approving..." : "Approve for Publishing"}
          </button>
        ) : null}

        {status === "approved" && canUsePublishingReady(assetType) ? (
          <Link href="/publishing-ready" className={websiteStyles.link}>
            Open Publishing Ready →
          </Link>
        ) : null}

        {assetType === "prospect_what_if_story" ? (
          <Link href="/what-if-stories" className={websiteStyles.link}>
            PDF / Gmail tools →
          </Link>
        ) : null}

        {["blog_post", "white_paper", "authority_asset"].includes(assetType) ? (
          <Link href="/content-repurposing" className={websiteStyles.link}>
            Repurpose asset →
          </Link>
        ) : null}

        <Link href={`/assets/${assetId}`} className={websiteStyles.link}>
          Open asset →
        </Link>
      </div>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
