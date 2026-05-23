export type QualityGateStatus =
  | "not_reviewed"
  | "strong"
  | "approved_quality"
  | "needs_revision"
  | "weak";

export function getQualityGateStatus(score: number | null | undefined): QualityGateStatus {
  if (score === null || score === undefined) return "not_reviewed";

  if (score >= 90) return "strong";
  if (score >= 80) return "approved_quality";
  if (score >= 70) return "needs_revision";

  return "weak";
}

export function getQualityGateLabel(score: number | null | undefined) {
  const status = getQualityGateStatus(score);

  switch (status) {
    case "strong":
      return "Strong quality";
    case "approved_quality":
      return "Good quality";
    case "needs_revision":
      return "Review suggested";
    case "weak":
      return "Needs revision";
    case "not_reviewed":
    default:
      return "Not reviewed";
  }
}

export function getQualityGateDescription(score: number | null | undefined) {
  const status = getQualityGateStatus(score);

  switch (status) {
    case "strong":
      return "This asset is scoring high enough to be a strong approval candidate.";
    case "approved_quality":
      return "This asset looks solid, but a quick human review is still recommended.";
    case "needs_revision":
      return "This asset may be usable, but the review notes should be checked first.";
    case "weak":
      return "This asset should likely be improved before approval or publishing.";
    case "not_reviewed":
    default:
      return "Run a quality review before approving if this asset will be published or sent to a prospect.";
  }
}

export function qualityScoreText(score: number | null | undefined) {
  if (score === null || score === undefined) return "Not reviewed";

  return `${score}/100`;
}
