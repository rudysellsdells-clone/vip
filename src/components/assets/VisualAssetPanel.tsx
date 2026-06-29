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

export function VisualAssetPanel({
  assetId,
  canManage,
  sourceStatus,
  primaryVisualAssetId,
  visualAssets,
}: VisualAssetPanelProps) {
  const router = useRouter();
  const [imageUse, setImageUse] = useState("social_square");
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
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

  async function generateVisual() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/visuals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUse }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to generate image.");
      }

      setMessage(result.isPrimary ? "Image generated and selected as primary." : "Image generated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error generating image.");
    } finally {
      setLoading(false);
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

  const canGenerate = canManage && isApprovedEnough(sourceStatus);

  return (
    <div className={formStyles.compactForm} style={{ marginTop: 18 }}>
      <div className={formStyles.header}>
        <h3 className={formStyles.smallTitle}>Visual assets</h3>
        <p className={formStyles.description}>
          Generate, store, download, regenerate, and choose the primary image that will later travel with this post or asset into publishing.
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
              VIP will use the approved content, campaign, account, and brand profile to build a detailed OpenAI image prompt.
            </span>
          </label>

          <div className={formStyles.actions} style={{ marginTop: 0 }}>
            <button
              type="button"
              onClick={generateVisual}
              disabled={loading || !canGenerate}
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

                  {canManage && !isPrimary ? (
                    <button
                      type="button"
                      onClick={() => makePrimary(visual.id)}
                      disabled={selectingId === visual.id}
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
