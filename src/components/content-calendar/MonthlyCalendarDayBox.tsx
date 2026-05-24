import Link from "next/link";
import {
  CalendarDay,
  entryTypeLabel,
  statusLabel,
} from "@/lib/content-calendar/monthly-calendar";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function MonthlyCalendarDayBox({
  day,
}: {
  day: CalendarDay;
}) {
  return (
    <article
      className={[
        websiteStyles.card,
        day.isCurrentMonth ? "" : "opacity-50",
      ].join(" ")}
      style={{
        minHeight: 210,
        padding: 14,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={websiteStyles.badge}>
          {day.dayNumber}
        </span>

        {day.entries.length ? (
          <span className={websiteStyles.badge}>
            {day.entries.length} item{day.entries.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="grid gap-2" style={{ marginTop: 12 }}>
        {day.entries.length ? (
          day.entries.slice(0, 5).map((entry) => (
            <div
              key={`${entry.source}-${entry.id}`}
              className={websiteStyles.card}
              style={{ padding: 10 }}
            >
              <div className="flex flex-wrap gap-1">
                <span className={websiteStyles.badge}>{entry.timeLabel}</span>
                <span className={websiteStyles.badge}>{entryTypeLabel(entry.itemType)}</span>
              </div>

              <h4 className={websiteStyles.cardTitle} style={{ marginTop: 8, fontSize: 14 }}>
                <Link href={entry.href} className={websiteStyles.link}>
                  {entry.title}
                </Link>
              </h4>

              <p className={websiteStyles.cardMeta}>
                {statusLabel(entry.status)} • {entry.source === "generated_asset" ? "Generated" : "Planned"}
              </p>

              {entry.description ? (
                <p className={websiteStyles.cardText} style={{ fontSize: 13 }}>
                  {String(entry.description).slice(0, 90)}...
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className={websiteStyles.cardMeta}>No content planned.</p>
        )}

        {day.entries.length > 5 ? (
          <p className={websiteStyles.cardMeta}>
            +{day.entries.length - 5} more item{day.entries.length - 5 === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
    </article>
  );
}
