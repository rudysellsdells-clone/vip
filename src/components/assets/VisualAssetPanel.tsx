"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

type VisualAssetRow = {
  id: string;
  title: string | null;
  content: string | null;
  status: string | null;
  asset_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type VisualAssetPanelProps = {
  assetId: string;
  canManage: boolean;
  sourceStatus: string | null;
  primaryVisualAssetId?: string | null;
  visualAssets: VisualAssetRow[];
};

function stringOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function visualUrl(asset: VisualAssetRow) {
  const metadata = metadataRecord(asset.metadata);
  return (
    stringOrNull(metadata.publicUrl) ??
    stringOrNull(metadata.hostedImageUrl) ??
    stringOrNull(metadata.imageUrl) ??
    stringOrNull(asset.content)
  );
}

function formatDate(value: string | null) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isApprovedEnough(status: string | null) {
  return ["approved", "scheduled", "ready_for_publishing", "publish_ready", "published"].includes(
    String(status ?? "").toLowerCase(),
  );
}

function visualStatusLabel(status: string | null) {
  const normalized = String(status ?? "stored").trim().toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "stored") return "Needs review";
  return normalized.replaceAll("_", " ");
}

export function VisualAssetPanel({
  assetId,
  canManage,
  sourceStatus,
  primaryVisualAssetId,
  visualAssets,
}: VisualAssetPanelProps) {
  const router = useRouter();
  const [imageUse, setImageUse] = useState("social_square");
  const [visualInstructions, setVisualInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedVisuals = useMemo(() => {
    return [...visualAssets].sort((a, b) => {
      const aPrimary = a.id === primaryVisualAssetId || metadataRecord(a.metadata).isPrimary === true;
      const bPrimary = b.id === primaryVisualAssetId || metadataRecord(b.metadata).isPrimary === true;
      if (aPrimary && !bPrimary) return -1;
      if (bPrimary && !aPrimary) return 1;
      return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    });
  }, [primaryVisualAssetId, visualAssets]);

  async function generateVisual(options?: {
    imageUseOverride?: string;
    regeneratedFromVisualAssetId?: string;
  }) {
    setLoading(!options?.regeneratedFromVisualAssetId);
    setRegeneratingId(options?.regeneratedFromVisualAssetId ?? null);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/visuals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUse: options?.imageUseOverride ?? imageUse,
          visualInstructions: visualInstructions.trim(),
          regeneratedFromVisualAssetId: options?.regeneratedFromVisualAssetId ?? null,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate image.");
      }

      setMessage(
        options?.regeneratedFromVisualAssetId
          ? "Image regenerated and saved for review."
          : result.isPrimary
            ? "Image generated and selected as primary."
            : "Image generated for review.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error generating image.");
    } finally {
      setLoading(false);
      setRegeneratingId(null);
    }
  }

  async function makePrimary(visualAssetId: string) {
    setSelectingId(visualAssetId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/visuals/${visualAssetId}/primary`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to choose primary image.");
      }

      setMessage("Primary image selected for publishing.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error selecting image.");
    } finally {
      setSelectingId(null);
    }
  }

  async function reviewVisual(visualAssetId: string, action: "approve" | "reject") {
    setReviewingId(`${action}:${visualAssetId}`);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/visuals/${visualAssetId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? `Unable to ${action} image.`);
      }

      setMessage(action === "approve" ? "Image approved and selected as primary." : "Image rejected.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unexpected error while trying to ${action} image.`);
    } finally {
      setReviewingId(null);
    }
  }

  const canGenerate = canManage && isApprovedEnough(sourceStatus);

  return (
    <div className={formStyles.compactForm} style={{ marginTop: 18 }}>
      <div className={formStyles.header}>
        <h3 className={formStyles.smallTitle}>Visual assets</h3>
        <p className={formStyles.description}>
          Generate, review, approve, reject, regenerate, and choose the primary image that will later travel with this post or asset into publishing.
        </p>
      </div>

      {canManage ? (
        <div className={formStyles.row} style={{ marginTop: 0 }}>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Image use</span>
            <select
              value={imageUse}
              onChange={(event) => setImageUse(event.target.value)}
              className={formStyles.select}
              disabled={loading}
            >
              <option value="social_square">Social post image</option>
              <option value="linkedin_post">LinkedIn post image</option>
              <option value="facebook_post">Facebook post image</option>
              <option value="blog_featured_image">Blog featured image</option>
              <option value="email_banner">Email banner image</option>
            </select>
            <span className={formStyles.help}>
              VIP will use the approved content, campaign, account, and brand profile to build a detailed image prompt.
            </span>
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Additional image direction</span>
            <textarea
              value={visualInstructions}
              onChange={(event) => setVisualInstructions(event.target.value)}
              rows={4}
              className={formStyles.textarea}
              disabled={loading}
              placeholder="Example: Show a dental practice owner reviewing search visibility gaps on a clean dashboard. Use our blue and gold palette. No logos, no text overlays, no fake UI labels."
            />
            <span className={formStyles.help}>
              These notes guide the image. VIP will not render them as visible text, labels, slogans, or logo marks inside the image.
            </span>
          </label>

          <div className={formStyles.actions} style={{ marginTop: 0 }}>
            <button
              type="button"
              onClick={() => generateVisual()}
              disabled={loading || Boolean(regeneratingId) || !canGenerate}
              className={formStyles.submit}
            >
              {loading ? "Generating Image..." : "Generate Image"}
            </button>
          </div>
        </div>
      ) : null}

      {!canGenerate ? (
        <p className={formStyles.help}>
          Images can be generated once the asset is approved and you have permission to manage this workspace.
        </p>
      ) : null}

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}

      <div className={formStyles.divider} />

      {sortedVisuals.length ? (
        <div className={websiteStyles.cardGrid}>
          {sortedVisuals.map((visual) => {
            const metadata = metadataRecord(visual.metadata);
            const url = visualUrl(visual);
            const isPrimary =
              visual.id === primaryVisualAssetId ||
              metadata.isPrimary === true ||
              metadata.selectedForPublish === true;
            const normalizedStatus = String(visual.status ?? "stored").toLowerCase();
            const isApproved = normalizedStatus === "approved";
            const isRejected = normalizedStatus === "rejected";
            const visualImageUse = stringOrNull(metadata.imageUse) ?? imageUse;

            return (
              <article key={visual.id} className={websiteStyles.card}>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt={visual.title ?? "Generated visual asset"}
                      style={{
                        width: "100%",
                        borderRadius: 14,
                        border: "1px solid #dbe5ef",
                        objectFit: "cover",
                        aspectRatio: "1 / 1",
                        background: "#f8fafc",
                      }}
                    />
                  </a>
                ) : (
                  <div className={websiteStyles.empty}>Image URL missing.</div>
                )}

                <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
                  {isPrimary ? <span className={websiteStyles.badge}>Primary image</span> : null}
                  <span className={websiteStyles.badge}>{visualStatusLabel(visual.status)}</span>
                  <span className={websiteStyles.badge}>
                    {String(metadata.imageUse ?? visual.asset_type ?? "visual").replaceAll("_", " ")}
                  </span>
                </div>

                <h4 className={websiteStyles.cardTitle} style={{ marginTop: 12 }}>
                  {visual.title ?? "Generated image"}
                </h4>
                <p className={websiteStyles.cardMeta}>{formatDate(visual.created_at)}</p>

                <div className={websiteStyles.cardActions}>
                  {url ? (
                    <a href={url} download className={websiteStyles.link} target="_blank" rel="noreferrer">
                      Download →
                    </a>
                  ) : null}

                  {canManage && !isApproved ? (
                    <button
                      type="button"
                      onClick={() => reviewVisual(visual.id, "approve")}
                      disabled={Boolean(reviewingId) || Boolean(regeneratingId)}
                      className={formStyles.submit}
                      style={{ minHeight: 42, padding: "0 14px", fontSize: 13 }}
                    >
                      {reviewingId === `approve:${visual.id}` ? "Approving..." : "Approve"}
                    </button>
                  ) : null}

                  {canManage && !isRejected ? (
                    <button
                      type="button"
                      onClick={() => reviewVisual(visual.id, "reject")}
                      disabled={Boolean(reviewingId) || Boolean(regeneratingId)}
                      className={formStyles.secondaryButton}
                      style={{ minHeight: 42, padding: "0 14px", fontSize: 13 }}
                    >
                      {reviewingId === `reject:${visual.id}` ? "Rejecting..." : "Reject"}
                    </button>
                  ) : null}

                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => generateVisual({ imageUseOverride: visualImageUse, regeneratedFromVisualAssetId: visual.id })}
                      disabled={Boolean(reviewingId) || Boolean(regeneratingId) || !canGenerate}
                      className={formStyles.secondaryButton}
                      style={{ minHeight: 42, padding: "0 14px", fontSize: 13 }}
                    >
                      {regeneratingId === visual.id ? "Regenerating..." : "Regenerate"}
                    </button>
                  ) : null}

                  {canManage && !isPrimary && !isRejected ? (
                    <button
                      type="button"
                      onClick={() => makePrimary(visual.id)}
                      disabled={selectingId === visual.id || Boolean(reviewingId) || Boolean(regeneratingId)}
                      className={formStyles.secondaryButton}
                      style={{ minHeight: 42, padding: "0 14px", fontSize: 13 }}
                    >
                      {selectingId === visual.id ? "Selecting..." : "Use as Primary"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={websiteStyles.empty}>
          No generated images yet. Generate the first visual after this asset is approved.
        </div>
      )}
    </div>
  );
}
