import {
  getQualityGateLabel,
  qualityScoreText,
} from "@/lib/content-quality/score-gates";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function ApprovalQualitySummaryBadge({
  score,
}: {
  score?: number | null;
}) {
  return (
    <>
      <span className={websiteStyles.badge}>
        Quality {qualityScoreText(score)}
      </span>
      <span className={websiteStyles.badge}>
        {getQualityGateLabel(score)}
      </span>
    </>
  );
}
