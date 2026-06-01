import { WebsiteMetric, websiteStyles } from "@/components/website-ui/WebsitePage";
import { CalendarViewRange } from "@/lib/calendar/view-range";

export function WorkingViewSummary({
  range,
  visibleCount,
  totalCount,
  totalLabel = "Total Working",
  visibleLabel = "Visible",
}: {
  range: CalendarViewRange;
  visibleCount: number;
  totalCount: number;
  totalLabel?: string;
  visibleLabel?: string;
}) {
  return (
    <div className={websiteStyles.cardGrid}>
      <WebsiteMetric
        label={visibleLabel}
        value={visibleCount}
        description={`Items in ${range.label}.`}
        dot="blue"
      />
      <WebsiteMetric
        label={totalLabel}
        value={totalCount}
        description="All active items in this working queue."
        dot="green"
      />
      <WebsiteMetric
        label="View"
        value={range.view}
        description={range.label}
        dot="purple"
      />
    </div>
  );
}
