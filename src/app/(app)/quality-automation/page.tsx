import Link from "next/link";
import { redirect } from "next/navigation";
import { RunBatchQualityGatesButton } from "@/components/content-quality/RunBatchQualityGatesButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { QUALITY_AUTOMATION_ASSET_TYPES, latestByAssetId } from "@/lib/content-quality/batch-quality-gates";
import { getOrCreateQualityGateSettings } from "@/lib/content-quality/quality-gates";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

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

function decisionLabel(value: string | null | undefined) {
  return String(value ?? "not evaluated").replaceAll("_", " ");
}

export default async function QualityAutomationPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const settings = await getOrCreateQualityGateSettings({
    supabase,
    userId: user.id,
  });

  const { data: assetsData } = await supabase
    .from("generated_assets")
    .select("id,title,asset_type,status,created_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .in("asset_type", QUALITY_AUTOMATION_ASSET_TYPES)
    .order("created_at", { ascending: false })
    .limit(75);

  const assets = (assetsData ?? []) as Array<Record<string, any>>;
  const assetIds = assets.map((asset) => asset.id).filter(Boolean);

  const { data: reviewsData } = assetIds.length
    ? await supabase
        .from("asset_quality_reviews")
        .select("*")
        .eq("user_id", user.id)
        .in("asset_id", assetIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const latestReviews = Array.from(
    latestByAssetId((reviewsData ?? []) as Array<Record<string, any>>).values()
  );
  const latestReviewIds = latestReviews.map((review) => review.id).filter(Boolean);

  const { data: decisionsData } = latestReviewIds.length
    ? await supabase
        .from("quality_gate_decisions")
        .select("*")
        .eq("user_id", user.id)
        .in("review_id", latestReviewIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const decisions = (decisionsData ?? []) as Array<Record<string, any>>;
  const decisionByReviewId = new Map<string, Record<string, any>>();

  for (const decision of decisions) {
    if (!decisionByReviewId.has(String(decision.review_id))) {
      decisionByReviewId.set(String(decision.review_id), decision);
    }
  }

  const assetById = new Map<string, Record<string, any>>(
    assets.map((asset) => [String(asset.id), asset])
  );

  const reviewedRows = latestReviews
    .map((review) => ({
      review,
      asset: assetById.get(String(review.asset_id)),
      decision: decisionByReviewId.get(String(review.id)) ?? null,
    }))
    .filter((row): row is { review: Record<string, any>; asset: Record<string, any>; decision: Record<string, any> | null } =>
      Boolean(row.asset)
    );

  const pendingRows = reviewedRows.filter((row) => !row.decision);
  const readyRows = reviewedRows.filter((row) => row.decision?.decision === "ready_for_publishing");
  const approvedRows = reviewedRows.filter((row) => row.decision?.decision === "auto_approved");
  const needsRevisionRows = reviewedRows.filter((row) => row.decision?.decision === "needs_revision");

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Quality Automation"
        title="Apply quality gates in bulk."
        description="Run your editable quality thresholds against the latest reviewed assets, skip reviews that already have a gate decision, and move passing assets into the Ready Queue."
        primaryAction={{ label: "Settings", href: "/settings" }}
        secondaryAction={{ label: "Ready Queue", href: "/ready-for-publishing" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Reviewed Assets"
          value={reviewedRows.length}
          description="Latest reviews available for gate evaluation."
          dot="blue"
        />
        <WebsiteMetric
          label="Pending Gates"
          value={pendingRows.length}
          description="Reviews without a gate decision."
          dot="gold"
        />
        <WebsiteMetric
          label="Ready"
          value={readyRows.length}
          description="Passed and marked ready."
          dot="green"
        />
        <WebsiteMetric
          label="Needs Revision"
          value={needsRevisionRows.length}
          description="Did not pass thresholds."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Run"
        title="Batch quality gate run"
        description="This checks the latest reviewed assets against your current Settings thresholds."
      >
        <div className={websiteStyles.card}>
          <div className="flex flex-wrap gap-2">
            <span className={websiteStyles.badge}>Mode: {String(settings.approval_mode).replaceAll("_", " ")}</span>
            <span className={websiteStyles.badge}>Overall ≥ {settings.overall_min}</span>
            <span className={websiteStyles.badge}>Brand ≥ {settings.brand_voice_min}</span>
            <span className={websiteStyles.badge}>CTA ≥ {settings.cta_min}</span>
            <span className={websiteStyles.badge}>
              Human review {settings.require_human_approval ? "required" : "optional"}
            </span>
          </div>

          <p className={websiteStyles.cardText} style={{ marginTop: 16 }}>
            Batch runs skip reviews that already have a quality gate decision. This keeps the
            decision history clean and prevents duplicate processing.
          </p>

          <RunBatchQualityGatesButton disabled={!pendingRows.length} />

          {!pendingRows.length ? (
            <p className={websiteStyles.cardMeta}>
              No pending reviewed assets need quality gate processing right now.
            </p>
          ) : null}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Queue"
        title="Reviewed assets and gate status"
        description="Use this as an operations view for quality automation."
      >
        {reviewedRows.length ? (
          <div className={websiteStyles.cardGrid}>
            {reviewedRows.map(({ asset, review, decision }) => (
              <article key={review.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={asset.status ?? "needs_review"} />
                  <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
                  <span className={websiteStyles.badge}>
                    Score {review.overall_score}/100
                  </span>
                  <span className={websiteStyles.badge}>
                    Gate: {decisionLabel(decision?.decision)}
                  </span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    {asset.title}
                  </Link>
                </h3>

                <p className={websiteStyles.cardMeta}>
                  Reviewed {formatDate(review.created_at)}
                </p>

                <p className={websiteStyles.cardText}>
                  {review.summary ?? "No review summary available."}
                </p>

                {decision?.reason ? (
                  <p className={websiteStyles.cardText}>
                    <strong>Gate reason:</strong> {decision.reason}
                  </p>
                ) : null}

                <div className={websiteStyles.actionRow}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    Open asset →
                  </Link>
                  <Link href="/approvals" className={websiteStyles.link}>
                    Approvals →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No reviewed assets yet. Run quality reviews from Approvals or Content Quality first.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
