import { buildQualityReviewerGuidance } from "@/lib/content-quality/reviewer-guidance";
import { websiteStyles } from "@/components/website-ui/WebsitePage";
import {
  normalizeReviewList,
  qualityScoreLabel,
  qualityScoreTone,
  reviewStatusLabel,
  scoreNumber,
} from "@/lib/content-quality/review-display";

function scoreBadge(score: number | null) {
  const tone = qualityScoreTone(score);
  const label = qualityScoreLabel(score);

  return (
    <span
      className={websiteStyles.badge}
      data-quality-tone={tone}
      title={score === null ? "No score saved" : `Overall quality score: ${score}`}
    >
      {score === null ? label : `${score} · ${label}`}
    </span>
  );
}

function miniScore(label: string, value: unknown) {
  const score = scoreNumber(value);

  return (
    <span className={websiteStyles.badge}>
      {label}: {score === null ? "—" : score}
    </span>
  );
}

function listBlock({
  title,
  items,
  max = 4,
}: {
  title: string;
  items: string[];
  max?: number;
}) {
  if (!items.length) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <p className={websiteStyles.cardMeta}>{title}</p>
      <ul style={{ marginTop: 6, paddingLeft: 18 }}>
        {items.slice(0, max).map((item) => (
          <li key={item} className={websiteStyles.cardText} style={{ marginTop: 4 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewerGuidancePanel({
  asset,
  review,
  compact,
}: {
  asset: Record<string, any>;
  review?: Record<string, any> | null;
  compact: boolean;
}) {
  const guidance = buildQualityReviewerGuidance({ asset, review });

  return (
    <div
      className={websiteStyles.card}
      style={{
        marginTop: 12,
        padding: compact ? 16 : 20,
        background: "#ffffff",
      }}
    >
      <div className="flex flex-wrap gap-2">
        <span className={websiteStyles.badge}>Reviewer focus: {guidance.readinessLabel}</span>
        <span className={websiteStyles.badge}>{guidance.scoreSummary}</span>
        <span className={websiteStyles.badge}>{guidance.detailDensityLabel}</span>
      </div>

      <p className={websiteStyles.cardText} style={{ marginTop: 10 }}>
        {guidance.headline}
      </p>

      {compact ? (
        guidance.nextSteps.length ? (
          <p className={websiteStyles.cardMeta}>
            Next check: {guidance.nextSteps[0]}
          </p>
        ) : null
      ) : (
        <>
          {guidance.genericFlags.length ? (
            <div style={{ marginTop: 12 }}>
              <p className={websiteStyles.cardMeta}>Generic language warning</p>
              <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
                {guidance.genericFlags.map((phrase) => (
                  <span key={phrase} className={websiteStyles.badge}>
                    “{phrase}”
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {listBlock({ title: "Missing specificity signals", items: guidance.missingSignals, max: 4 })}
          {listBlock({ title: "Reviewer next steps", items: guidance.nextSteps, max: 5 })}
          {listBlock({ title: "Asset-type checklist", items: guidance.checklist, max: 5 })}
          {listBlock({ title: "Questions before approval", items: guidance.reviewerQuestions, max: 3 })}
        </>
      )}
    </div>
  );
}

export function QualityScorePanel({
  asset,
  review,
  compact = false,
}: {
  asset: Record<string, any>;
  review?: Record<string, any> | null;
  compact?: boolean;
}) {
  const overall = scoreNumber(review?.overall_score);
  const strengths = normalizeReviewList(review?.strengths).slice(0, 2);
  const improvements = normalizeReviewList(review?.improvements).slice(0, 3);
  const status = reviewStatusLabel({ asset, review });

  return (
    <div className={websiteStyles.card} style={{ marginTop: 14 }}>
      <div className="flex flex-wrap gap-2">
        {scoreBadge(overall)}
        <span className={websiteStyles.badge}>{status}</span>
      </div>

      {review ? (
        <>
          {!compact ? (
            <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
              {miniScore("Brand", review.brand_voice_score)}
              {miniScore("Clarity", review.clarity_score)}
              {miniScore("CTA", review.cta_score)}
              {miniScore("SEO/AIO", review.seo_aio_score)}
              {miniScore("Conversion", review.conversion_score)}
            </div>
          ) : null}

          {review.summary ? (
            <p className={websiteStyles.cardText} style={{ marginTop: 10 }}>
              {String(review.summary)}
            </p>
          ) : null}

          <ReviewerGuidancePanel asset={asset} review={review} compact={compact} />

          {!compact && improvements.length ? (
            <div style={{ marginTop: 10 }}>
              <p className={websiteStyles.cardMeta}>Needs attention</p>
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                {improvements.map((item) => (
                  <li key={item} className={websiteStyles.cardText}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!compact && strengths.length ? (
            <div style={{ marginTop: 10 }}>
              <p className={websiteStyles.cardMeta}>Strengths</p>
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                {strengths.map((item) => (
                  <li key={item} className={websiteStyles.cardText}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className={websiteStyles.cardText} style={{ marginTop: 10 }}>
            This asset has not been quality tested yet.
          </p>
          <ReviewerGuidancePanel asset={asset} review={null} compact={compact} />
        </>
      )}
    </div>
  );
}
