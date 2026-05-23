import Link from "next/link";
import { QualityReviewButton } from "@/components/content-quality/QualityReviewButton";
import { RequestQualityResubmissionButton } from "@/components/content-quality/RequestQualityResubmissionButton";
import {
  getQualityGateDescription,
  getQualityGateLabel,
  qualityScoreText,
} from "@/lib/content-quality/score-gates";
import { loadLatestQualityReview } from "@/lib/content-quality/latest-review";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

function scoreLine(label: string, score: number | null | undefined) {
  if (score === null || score === undefined) return `${label}: —`;

  return `${label}: ${score}/100`;
}

export async function ApprovalQualityPanel({
  assetId,
}: {
  assetId: string;
}) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { review, error } = await loadLatestQualityReview({
    supabase,
    userId: user.id,
    assetId,
  });

  if (error) {
    return (
      <div className={websiteStyles.empty}>
        Quality review could not be loaded: {error}
      </div>
    );
  }

  const score = review?.overall_score ?? null;

  return (
    <div className={websiteStyles.card} style={{ marginTop: 16 }}>
      <div className="flex flex-wrap gap-2">
        <span className={websiteStyles.badge}>
          Quality: {qualityScoreText(score)}
        </span>
        <span className={websiteStyles.badge}>
          {getQualityGateLabel(score)}
        </span>
      </div>

      <h4 className={websiteStyles.cardTitle} style={{ marginTop: 12 }}>
        Quality Check
      </h4>

      <p className={websiteStyles.cardText}>
        {getQualityGateDescription(score)}
      </p>

      {review ? (
        <div className="grid gap-2">
          <p className={websiteStyles.cardText}>
            <strong>Summary:</strong> {review.summary}
          </p>

          <p className={websiteStyles.cardMeta}>
            {scoreLine("Brand", review.brand_voice_score)} •{" "}
            {scoreLine("Clarity", review.clarity_score)} •{" "}
            {scoreLine("CTA", review.cta_score)} •{" "}
            {scoreLine("SEO/AIO", review.seo_aio_score)} •{" "}
            {scoreLine("Conversion", review.conversion_score)}
          </p>

          {Array.isArray(review.improvements) && review.improvements.length ? (
            <div>
              <p className={websiteStyles.cardMeta}>Suggested improvements</p>
              <div className="grid gap-1">
                {review.improvements.slice(0, 3).map((item: string) => (
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

      <div className={websiteStyles.actionRow}>
        <QualityReviewButton assetId={assetId} />

        {review ? (
          <RequestQualityResubmissionButton reviewId={review.id} />
        ) : null}

        <Link href="/content-quality" className={websiteStyles.link}>
          Open Content Quality →
        </Link>
      </div>
    </div>
  );
}
