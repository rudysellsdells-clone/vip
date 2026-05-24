import Link from "next/link";
import { redirect } from "next/navigation";
import { MonthSelector } from "@/components/content-calendar/MonthSelector";
import { MonthlyCalendarDayBox } from "@/components/content-calendar/MonthlyCalendarDayBox";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import {
  buildCalendarGrid,
  buildMonthOptionsFromRows,
  calendarEntryFromAsset,
  calendarEntryFromItem,
  monthLabel,
  monthRange,
  monthValueFromDate,
  parseMonthValue,
} from "@/lib/content-calendar/monthly-calendar";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function currentMonthValue(searchParams: Record<string, string | string[] | undefined>) {
  return parseMonthValue(firstValue(searchParams.month)).value;
}

function safeRows(data: unknown) {
  return (Array.isArray(data) ? data : []) as Array<Record<string, any>>;
}

export default async function MonthlyContentCalendarPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedMonth = currentMonthValue(resolvedSearchParams);
  const selectedRange = monthRange(selectedMonth);

  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: allAssetsData }, { data: allItemsData }] = await Promise.all([
    supabase
      .from("generated_assets")
      .select("id,title,asset_type,status,content,created_at,scheduled_publish_at,publish_timezone,scheduling_status,campaign_id")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("content_calendar_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const allAssets = safeRows(allAssetsData);
  const allItems = safeRows(allItemsData);
  const monthOptions = buildMonthOptionsFromRows([...allAssets, ...allItems]);

  const selectedInOptions = monthOptions.some((option) => option.value === selectedMonth);
  const options = selectedInOptions
    ? monthOptions
    : [
        {
          value: selectedMonth,
          label: monthLabel(selectedMonth),
        },
        ...monthOptions,
      ];

  const selectedEntries = [
    ...allItems
      .map(calendarEntryFromItem)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .filter((entry) => entry.date >= selectedMonth + "-01" && entry.date < monthValueFromDate(selectedRange.end) + "-01"),
    ...allAssets
      .map(calendarEntryFromAsset)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .filter((entry) => entry.date >= selectedMonth + "-01" && entry.date < monthValueFromDate(selectedRange.end) + "-01"),
  ];

  const calendarDays = buildCalendarGrid({
    monthValue: selectedMonth,
    entries: selectedEntries,
  });

  const generatedCount = selectedEntries.filter((entry) => entry.source === "generated_asset").length;
  const plannedCount = selectedEntries.filter((entry) => entry.source === "calendar_item").length;
  const scheduledCount = selectedEntries.filter((entry) => entry.timeLabel !== "Any time").length;
  const emptyDays = calendarDays.filter((day) => day.isCurrentMonth && !day.entries.length).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Monthly Content Calendar"
        title={`${monthLabel(selectedMonth)} content calendar`}
        description="View proposed and generated content by month. Each day box shows planned calendar items and generated assets scheduled for that day."
        primaryAction={{ label: "Content Calendar", href: "/content-calendar" }}
        secondaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
      />

      <WebsiteSection
        eyebrow="Month"
        title="Select a generated content month"
        description="The dropdown is built from months where VIP has planned or generated content."
      >
        <div className={websiteStyles.card}>
          <MonthSelector value={selectedMonth} options={options} />

          <div className={websiteStyles.actionRow} style={{ marginTop: 16 }}>
            <Link href="/content-calendar" className={websiteStyles.link}>
              Open planner →
            </Link>
            <Link href="/publishing-schedule" className={websiteStyles.link}>
              Manage publish times →
            </Link>
            <Link href="/quality-automation" className={websiteStyles.link}>
              Quality automation →
            </Link>
          </div>
        </div>
      </WebsiteSection>

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Total Items"
          value={selectedEntries.length}
          description="Planned and generated content in this month."
          dot="blue"
        />
        <WebsiteMetric
          label="Generated"
          value={generatedCount}
          description="Generated assets shown on the calendar."
          dot="green"
        />
        <WebsiteMetric
          label="Planned"
          value={plannedCount}
          description="Content calendar items shown."
          dot="gold"
        />
        <WebsiteMetric
          label="Scheduled"
          value={scheduledCount}
          description="Items with specific publish times."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Calendar"
        title="Monthly view"
        description="Use this view to quickly see content density, empty days, and whether the month is spaced out properly."
      >
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className={websiteStyles.card} style={{ padding: 10 }}>
              <strong>{day}</strong>
            </div>
          ))}

          {calendarDays.map((day) => (
            <MonthlyCalendarDayBox key={day.dateKey} day={day} />
          ))}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Notes"
        title="Calendar health"
        description="Quick read on whether the month is overpacked, underplanned, or missing schedule detail."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Open Days</h3>
            <p className={websiteStyles.cardText}>
              {emptyDays} day(s) in this month have no content assigned.
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Scheduling Detail</h3>
            <p className={websiteStyles.cardText}>
              {scheduledCount} of {selectedEntries.length} item(s) have a specific time. Use Publishing Schedule to fill gaps.
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Best Next Step</h3>
            <p className={websiteStyles.cardText}>
              Use this page to inspect the month visually, then use Publishing Schedule to adjust exact dates and times.
            </p>
          </article>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
