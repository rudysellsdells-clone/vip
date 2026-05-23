import { websiteStyles } from "@/components/website-ui/WebsitePage";

function decisionLabel(value: string | null | undefined) {
  const decision = String(value ?? "not_evaluated").replaceAll("_", " ");

  return decision.charAt(0).toUpperCase() + decision.slice(1);
}

export function QualityGateDecisionBadge({
  decision,
  passed,
}: {
  decision?: string | null;
  passed?: boolean | null;
}) {
  if (!decision) {
    return (
      <span className={websiteStyles.badge}>
        Gate not applied
      </span>
    );
  }

  return (
    <>
      <span className={websiteStyles.badge}>
        Gate: {decisionLabel(decision)}
      </span>
      <span className={websiteStyles.badge}>
        {passed ? "Passed" : "Did not pass"}
      </span>
    </>
  );
}
