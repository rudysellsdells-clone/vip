import { CalendarViewSelector } from "@/components/calendar/CalendarViewSelector";
import { WorkingViewSummary } from "@/components/calendar/WorkingViewSummary";
import { CalendarViewRange } from "@/lib/calendar/view-range";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function WorkingViewControls({
  basePath,
  range,
  visibleCount,
  totalCount,
  title = "Working view",
  description = "Switch between daily, weekly, and monthly views.",
  totalLabel = "Total Working",
  visibleLabel = "Visible",
}: {
  basePath: string;
  range: CalendarViewRange;
  visibleCount: number;
  totalCount: number;
  title?: string;
  description?: string;
  totalLabel?: string;
  visibleLabel?: string;
}) {
  return (
    <div className={websiteStyles.cardGrid}>
      <article className={websiteStyles.card}>
        <CalendarViewSelector
          basePath={basePath}
          view={range.view}
          dateValue={range.dateValue}
          label={title}
          description={description}
        />
      </article>

      <WorkingViewSummary
        range={range}
        visibleCount={visibleCount}
        totalCount={totalCount}
        totalLabel={totalLabel}
        visibleLabel={visibleLabel}
      />
    </div>
  );
}
