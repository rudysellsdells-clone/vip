"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QualityGateActionPanel } from "@/components/content-quality/QualityGateActionPanel";
import formStyles from "@/components/forms/VipForm.module.css";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

type QualityReview = {
  id: string;
  overall_score: number;
  brand_voice_score: number;
  clarity_score: number;
  cta_score: number;
  seo_aio_score: number;
  conversion_score: number;
  status: string;
  summary: string | null;
  improvements: string[] | null;
  suggested_revision: string | null;
};

function scoreText(score?: number | null) {
  if (score === null || score === undefined) return "Not reviewed";
  return `${score}/100`;
}

function qualityLabel(score?: number | null) {
  if (score === null || score === undefined) return "Not reviewed";
  if (score >= 90) return "Strong quality";
  if (score >= 80) return "Good quality";
  if (score >= 70) return "Review suggested";
  return "Needs revision";
}

function qualityDescription(score?: number | null) {
  if (score === null || score === undefined) {
    return "Run a quality review before approving if this will be published or sent to a prospect.";
  }

  if (score >= 90) {
    return "This asset is scoring high enough to be a strong approval candidate.";
  }

  if (score >= 80) {
    return "This asset looks solid, but a quick human review is still recommended.";
  }

  if (score >= 70) {
    return "This asset may be usable, but the review notes should be checked first.";
  }

  return "This asset should likely be improved before approval or publishing.";
}

export function ApprovalQualityWidget({
  assetId,
}: {
  assetId: string;
}) {
  const [review, setReview] = useState<QualityReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningReview, setRunningReview] = useState(false);
  const [runningResubmit, setRunningResubmit] = useState(false);
  const [newAssetId, setNewAssetId] = useState<string | null>(null);
  const [gateRefreshKey, setGateRefreshKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const overallScore = review?.overall_score ?? null;

  const improvements = useMemo(() => {
    if (!Array.isArray(review?.improvements)) return [];
    return review.improvements.slice(0, 3);
  }, [review]);

  async function loadLatestReview() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/quality-review/latest`, {
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load quality review.");
      }

      setReview(result.review ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected quality review load error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLatestReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  async function handleReviewQuality() {
    const confirmed = window.confirm("Run a quality and brand intelligence review for this asset?");

    if (!confirmed) return;

    setRunningReview(true);
    setMessage(null);
    setError(null);
    setNewAssetId(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/quality-review`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to review asset quality.");
      }

      setReview(result.review ?? null);
      setGateRefreshKey((value) => value + 1);
      setMessage(`Quality review complete. Score: ${result.review?.overall_score ?? "N/A"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected review error.");
    } finally {
      setRunningReview(false);
    }
  }

  async function handleRequestImprovedVersion() {
    if (!review?.id) {
      setError("Run a quality review before requesting an improved version.");
      return;
    }

    const confirmed = window.confirm(
      "Request a new version based on this quality review? VIP will create a new asset and send it back to the review queue."
    );

    if (!confirmed) return;

    setRunningResubmit(true);
    setMessage(null);
    setError(null);
    setNewAssetId(null);

    try {
      const response = await fetch(`/api/quality-reviews/${review.id}/resubmit`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to request quality resubmission.");
      }

      setNewAssetId(result.asset?.id ?? null);
      setMessage("New version created and sent to review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected resubmission error.");
    } finally {
      setRunningResubmit(false);
    }
  }

  return (
    <div className={websiteStyles.card} style={{ marginTop: 16 }}>
      <div className="flex flex-wrap gap-2">
        <span className={websiteStyles.badge}>Quality: {scoreText(overallScore)}</span>
        <span className={websiteStyles.badge}>{qualityLabel(overallScore)}</span>
      </div>

      <h4 className={websiteStyles.cardTitle} style={{ marginTop: 12 }}>
        Quality Check
      </h4>

      {loading ? (
        <p className={websiteStyles.cardText}>Loading quality review...</p>
      ) : (
        <>
          <p className={websiteStyles.cardText}>{qualityDescription(overallScore)}</p>

          {review ? (
            <div className="grid gap-2">
              {review.summary ? (
                <p className={websiteStyles.cardText}>
                  <strong>Summary:</strong> {review.summary}
                </p>
              ) : null}

              <p className={websiteStyles.cardMeta}>
                Brand {review.brand_voice_score}/100 • Clarity {review.clarity_score}/100 • CTA{" "}
                {review.cta_score}/100 • SEO/AIO {review.seo_aio_score}/100 • Conversion{" "}
                {review.conversion_score}/100
              </p>

              {improvements.length ? (
                <div>
                  <p className={websiteStyles.cardMeta}>Suggested improvements</p>
                  <div className="grid gap-1">
                    {improvements.map((item) => (
                      <p key={item} className={websiteStyles.cardText}>
                        • {item}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className={websiteStyles.cardText}>
              This asset has not been scored yet.
            </p>
          )}
        </>
      )}

      <div className={websiteStyles.card} style={{ marginTop: 12 }}>
        <h4 className={websiteStyles.cardTitle}>Quality Gate</h4>
        <p className={websiteStyles.cardText}>
          Compare this review against the editable thresholds in Settings.
        </p>
        <QualityGateActionPanel
          key={`${assetId}-${review?.id ?? "none"}-${gateRefreshKey}`}
          assetId={assetId}
          reviewId={review?.id ?? null}
          disabled={!review}
        />
      </div>

      <div className={websiteStyles.actionRow}>
        <button
          type="button"
          onClick={handleReviewQuality}
          disabled={runningReview || loading}
          className={formStyles.submit}
        >
          {runningReview ? "Reviewing..." : "Review Quality"}
        </button>

        <button
          type="button"
          onClick={handleRequestImprovedVersion}
          disabled={!review || runningResubmit}
          className={formStyles.secondaryButton}
        >
          {runningResubmit ? "Creating Version..." : "Request Improved Version"}
        </button>

        <Link href="/settings" className={websiteStyles.link}>
          Quality Settings →
        </Link>

        <Link href="/content-quality" className={websiteStyles.link}>
          Open Content Quality →
        </Link>

        {newAssetId ? (
          <Link href={`/assets/${newAssetId}`} className={websiteStyles.link}>
            Open new version →
          </Link>
        ) : null}
      </div>

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </div>
  );
}
