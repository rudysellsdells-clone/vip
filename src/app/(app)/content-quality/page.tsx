import Link from "next/link";
import { redirect } from "next/navigation";
import { QualityReviewButton } from "@/components/content-quality/QualityReviewButton";
import { RequestQualityResubmissionButton } from "@/components/content-quality/RequestQualityResubmissionButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

const REVIEWABLE_TYPES = [
  "blog_post",
  "white_paper",
  "authority_asset",
  "prospect_what_if_story",
  "linkedin_post",
  "facebook_post",
  "email",
  "video_script",
];

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function typeLabel(value: string | null | undefined) {
  return String(value ?? "asset").replaceAll("_", " ");
}

function scoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) return "Not reviewed";
  return `${score}/100`;
}

function scoreStatus(score: number | null | undefined) {
  if (score === null || score === undefined) return "not reviewed";
  if (score >= 85) return "strong";
  if (score >= 70) return "reviewed";
  return "needs revision";
}

function latestReviewForAsset(
  reviews: Array<Record<string, any>>,
  assetId: string
) {
  return reviews.find((review) => review.asset_id === assetId) ?? null;
}

function averageScore(reviews: Array<Record<string, any>>) {
  if (!reviews.length) return 0;

  const total = reviews.reduce((sum, review) => sum + Number(review.overall_score ?? 0), 0);

  return Math.round(total / reviews.length);
}

export default async function ContentQualityPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: assetsData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .in("asset_type", REVIEWABLE_TYPES)
    .order("created_at", { ascending: false })
    .limit(24);

  const assets = (assetsData ?? []) as Array<Record<string, any>>;
  const assetIds = assets.map((asset) => asset.id);

  const { data: reviewsData } = assetIds.length
    ? await supabase
        .from("asset_quality_reviews")
        .select("*")
        .eq("user_id", user.id)
        .in("asset_id", assetIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const reviews = (reviewsData ?? []) as Array<Record<string, any>>;
  const reviewedAssetIds = new Set(reviews.map((review) => review.asset_id));
  const reviewedCount = reviewedAssetIds.size;
  const needsRevisionCount = reviews.filter((review) => review.status === "needs_revision").length;
  const strongCount = reviews.filter((review) => review.status === "strong").length;
  const avgScore = averageScore(reviews);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Content Quality"
        title="Score content, then request a stronger version."
        description="Review active assets for brand voice, clarity, CTA strength, SEO/AIO readiness, and conversion usefulness. Then request an improved resubmission based on the review notes."
        primaryAction={{ label: "Review Queue", href: "/approvals" }}
        secondaryAction={{ label: "Reporting", href: "/phase-two-reporting" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Reviewable Assets"
          value={assets.length}
          description="Active assets available for quality review."
          dot="blue"
        />
        <WebsiteMetric
          label="Reviewed"
          value={reviewedCount}
          description="Assets with at least one quality review."
          dot="gold"
        />
        <WebsiteMetric
          label="Average Score"
          value={avgScore}
          description="Average score across recent reviews."
          dot="purple"
        />
        <WebsiteMetric
          label="Needs Revision"
          value={needsRevisionCount}
          description="Reviews that recommend improvement."
          dot="green"
        />
      </section>

      <WebsiteSection
        eyebrow="Review"
        title="Active assets to score and improve"
        description="Run a quality review, then request an improved version when the notes show the content can be stronger."
      >
        {assets.length ? (
          <div className={websiteStyles.cardGrid}>
            {assets.map((asset) => {
              const latestReview = latestReviewForAsset(reviews, asset.id);

              return (
                <article key={asset.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap gap-2">
                    <WebsiteBadge status={asset.status ?? "needs_review"} />
                    <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
                    <span className={websiteStyles.badge}>
                      Score: {scoreLabel(latestReview?.overall_score)}
                    </span>
                    <span className={websiteStyles.badge}>
                      {scoreStatus(latestReview?.overall_score)}
                    </span>
                  </div>

                  <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                    <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                      {asset.title}
                    </Link>
                  </h3>

                  <p className={websiteStyles.cardMeta}>
                    Created {formatDate(asset.created_at)}
                  </p>

                  <p className={websiteStyles.cardText}>
                    {String(asset.content ?? "").slice(0, 220)}...
                  </p>

                  {latestReview ? (
                    <div className="grid gap-2">
                      <p className={websiteStyles.cardText}>
                        <strong>Summary:</strong> {latestReview.summary}
                      </p>
                      <p className={websiteStyles.cardMeta}>
                        Brand {latestReview.brand_voice_score}/100 • Clarity{" "}
                        {latestReview.clarity_score}/100 • CTA {latestReview.cta_score}/100 •
                        SEO/AIO {latestReview.seo_aio_score}/100 • Conversion{" "}
                        {latestReview.conversion_score}/100
                      </p>
                    </div>
                  ) : null}

                  <div className={websiteStyles.actionRow}>
                    <QualityReviewButton assetId={asset.id} />
                    {latestReview ? (
                      <RequestQualityResubmissionButton reviewId={latestReview.id} />
                    ) : null}
                    <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                      Open asset →
                    </Link>
                    {asset.status === "needs_review" ? (
                      <Link href="/approvals" className={websiteStyles.link}>
                        Review queue →
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No active assets available for quality review yet.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Recent Reviews"
        title="Latest quality reviews"
        description="Use the review notes to request a stronger version before approval, publishing, or outreach."
      >
        {reviews.length ? (
          <div className={websiteStyles.cardGrid}>
            {reviews.slice(0, 12).map((review) => (
              <article key={review.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={review.status ?? "reviewed"} />
                  <span className={websiteStyles.badge}>
                    Overall {review.overall_score}/100
                  </span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  Quality Review
                </h3>

                <p className={websiteStyles.cardMeta}>
                  Created {formatDate(review.created_at)}
                </p>

                <p className={websiteStyles.cardText}>{review.summary}</p>

                {Array.isArray(review.improvements) && review.improvements.length ? (
                  <div>
                    <p className={websiteStyles.cardMeta}>Suggested improvements</p>
                    <div className="grid gap-2">
                      {review.improvements.slice(0, 3).map((item: string) => (
                        <p key={item} className={websiteStyles.cardText}>
                          • {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {review.suggested_revision ? (
                  <p className={websiteStyles.cardText}>
                    <strong>Suggested revision:</strong>{" "}
                    {String(review.suggested_revision).slice(0, 260)}...
                  </p>
                ) : null}

                <div className={websiteStyles.actionRow}>
                  <RequestQualityResubmissionButton reviewId={review.id} />
                  <Link href={`/assets/${review.asset_id}`} className={websiteStyles.link}>
                    Open asset →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No quality reviews yet. Run the first review above.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
