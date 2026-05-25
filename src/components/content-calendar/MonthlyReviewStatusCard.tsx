import { MonthlyReviewCounts } from "@/lib/content-calendar/monthly-review";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function MonthlyReviewStatusCard({
  counts,
}: {
  counts: MonthlyReviewCounts;
}) {
  const readyForApproval = counts.needsReview === 0 && counts.total > 0;
  const readyForPublishing = counts.approved > 0 && counts.unscheduled === 0;

  return (
    <article className={websiteStyles.card}>
      <h3 className={websiteStyles.cardTitle}>Workflow Readiness</h3>

      <div className="grid gap-2" style={{ marginTop: 12 }}>
        <p className={websiteStyles.cardText}>
          <strong>Review:</strong>{" "}
          {readyForApproval
            ? "All generated assets have moved past needs review."
            : `${counts.needsReview} asset(s) still need review.`}
        </p>

        <p className={websiteStyles.cardText}>
          <strong>Approval:</strong> {counts.approved} approved asset(s).
        </p>

        <p className={websiteStyles.cardText}>
          <strong>Schedule:</strong>{" "}
          {counts.unscheduled === 0
            ? "All assets have planning/schedule dates."
            : `${counts.unscheduled} asset(s) are missing schedule placement.`}
        </p>

        <p className={websiteStyles.cardText}>
          <strong>Publishing:</strong>{" "}
          {readyForPublishing
            ? "Approved assets are ready to flow into Publishing Ready when due."
            : "Keep reviewing, approving, and scheduling before publishing."}
        </p>
      </div>
    </article>
  );
}
