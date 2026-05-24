import Link from "next/link";
import { redirect } from "next/navigation";
import { GenerateMonthlyCampaignsButton } from "@/components/content-calendar/GenerateMonthlyCampaignsButton";
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
  belongsToSelectedMonth,
  buildCalendarGrid,
  buildMonthOptionsFromRows,
  calendarEntryFromAsset,
  calendarEntryFromCampaign,
  calendarEntryFromItem,
  contentMonthOptionsFromRows,
  monthLabel,
  monthValueFromDate,
  parseMonthValue,
} from "@/lib/content-calendar/campaign-aware-monthly-calendar";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function safeRows(data: unknown) {
  return (Array.isArray(data) ? data : []) as Array<Record<string, any>>;
}

function requestedMonth(searchParams: Record<string, string | string[] | undefined>) {
  const value = firstValue(searchParams.month);

  if (!value) return null;

  return parseMonthValue(value).value;
}

function chooseDefaultMonth({
  requested,
  contentMonths,
}: {
  requested: string | null;
  contentMonths: string[];
}) {
  if (requested) return requested;

  const current = monthValueFromDate(new Date());

  if (contentMonths.includes(current)) return current;

  const futureOrCurrent = contentMonths.find((month) => month >= current);

  if (futureOrCurrent) return futureOrCurrent;

  return contentMonths[contentMonths.length - 1] ?? current;
}

function unplacedReason(row: Record<string, any>) {
  const hasAnyDate =
    row.intended_publish_month ||
    row.campaign_month ||
    row.planned_publish_date ||
    row.scheduled_publish_at ||
    row.target_publish_at ||
    row.publish_at ||
    row.planned_date ||
    row.campaign_week_start_date;

  if (!hasAnyDate) {
    return "Missing intended month, planned date, scheduled time, and campaign week.";
  }

  return "Has partial calendar metadata, but no usable display date.";
}

function rowTitle(row: Record<string, any>) {
  return row.title ?? row.name ?? row.item_title ?? row.asset_title ?? "Untitled record";
}

function rowType(row: Record<string, any>) {
  return row.item_type ?? row.asset_type ?? row.type ?? "content";
}

export default async function MonthlyContentCalendarPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requested = requestedMonth(resolvedSearchParams);

  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: campaignsData }, { data: allAssetsData }, { data: allItemsData }] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(800),
      supabase
        .from("content_calendar_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(800),
    ]);

  const campaigns = safeRows(campaignsData);
  const allAssets = safeRows(allAssetsData);
  const allItems = safeRows(allItemsData);

  const allRows = [...campaigns, ...allAssets, ...allItems];
  const contentMonths = contentMonthOptionsFromRows(allRows);
  const selectedMonth = chooseDefaultMonth({
    requested,
    contentMonths,
  });

  const campaignById = new Map<string, Record<string, any>>(
    campaigns.map((campaign) => [String(campaign.id), campaign])
  );

  const campaignEntriesRaw = campaigns.map(calendarEntryFromCampaign);
  const itemEntriesRaw = allItems.map((item) => calendarEntryFromItem({ item, campaignById }));
  const assetEntriesRaw = allAssets.map((asset) => calendarEntryFromAsset({ asset, campaignById }));

  const allEntries = [
    ...campaignEntriesRaw.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    ...itemEntriesRaw.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    ...assetEntriesRaw.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
  ];

  const unplacedCampaigns = campaigns.filter((_, index) => !campaignEntriesRaw[index]);
  const unplacedItems = allItems.filter((_, index) => !itemEntriesRaw[index]);
  const unplacedAssets = allAssets.filter((_, index) => !assetEntriesRaw[index]);
  const unplacedRecords = [
    ...unplacedCampaigns.map((row) => ({ source: "Campaign", row })),
    ...unplacedItems.map((row) => ({ source: "Planned Item", row })),
    ...unplacedAssets.map((row) => ({ source: "Generated Asset", row })),
  ];

  const monthOptions = buildMonthOptionsFromRows(allRows);
  const selectedInOptions = monthOptions.some((option) => option.value === selectedMonth);
  const options = selectedInOptions
    ? monthOptions
    : [
        {
          value: selectedMonth,
          label: monthLabel(selectedMonth),
        },
        ...monthOptions,
      ].sort((a, b) => a.value.localeCompare(b.value));

  const entries = allEntries.filter((entry) => belongsToSelectedMonth(entry, selectedMonth));

  const calendarDays = buildCalendarGrid({
    monthValue: selectedMonth,
    entries,
  });

  const campaignCount = entries.filter((entry) => entry.source === "campaign").length;
  const generatedCount = entries.filter((entry) => entry.source === "generated_asset").length;
  const plannedCount = entries.filter((entry) => entry.source === "calendar_item").length;
  const scheduledCount = entries.filter((entry) => entry.timeLabel !== "Any time" && entry.timeLabel !== "Week").length;
  const emptyDays = calendarDays.filter((day) => day.isCurrentMonth && !day.entries.length).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Monthly Content Calendar"
        title={`${monthLabel(selectedMonth)} campaign calendar`}
        description="View campaigns, planned content, and generated assets by intended publish month. Missing-date records are now shown below instead of disappearing."
        primaryAction={{ label: "Content Calendar", href: "/content-calendar" }}
        secondaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
      />

      <WebsiteSection
        eyebrow="Month"
        title="Select or generate a campaign month"
        description="The dropdown includes rolling months and detected content months. Use the unplaced records section to find content missing calendar metadata."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
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
          </article>

          <article className={websiteStyles.card}>
            <GenerateMonthlyCampaignsButton defaultMonth={selectedMonth || monthValueFromDate(new Date())} />
          </article>
        </div>
      </WebsiteSection>

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Calendar Items"
          value={entries.length}
          description="Campaigns, planned items, and generated assets in selected month."
          dot="blue"
        />
        <WebsiteMetric
          label="Generated Assets"
          value={generatedCount}
          description="Generated assets in selected month."
          dot="gold"
        />
        <WebsiteMetric
          label="Planned Items"
          value={plannedCount}
          description="Calendar/planned items in selected month."
          dot="green"
        />
        <WebsiteMetric
          label="Unplaced"
          value={unplacedRecords.length}
          description="Loaded records missing usable calendar dates."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Calendar"
        title="Monthly view"
        description="Campaigns appear on week start days. Generated assets and planned items appear on planned or scheduled publish dates."
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

      {unplacedRecords.length ? (
        <WebsiteSection
          eyebrow="Needs Placement"
          title="Unplaced records"
          description="These records loaded from the database but do not have enough calendar metadata to appear in a month. Run the rehome SQL to assign them to June."
        >
          <div className={websiteStyles.cardGrid}>
            {unplacedRecords.slice(0, 36).map(({ source, row }) => (
              <article key={`${source}-${row.id}`} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <span className={websiteStyles.badge}>{source}</span>
                  <span className={websiteStyles.badge}>{String(rowType(row)).replaceAll("_", " ")}</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  {rowTitle(row)}
                </h3>

                <p className={websiteStyles.cardText}>{unplacedReason(row)}</p>

                {source === "Generated Asset" && row.id ? (
                  <Link href={`/assets/${row.id}`} className={websiteStyles.link}>
                    Open asset →
                  </Link>
                ) : null}
              </article>
            ))}
          </div>

          {unplacedRecords.length > 36 ? (
            <p className={websiteStyles.cardMeta} style={{ marginTop: 16 }}>
              Showing 36 of {unplacedRecords.length} unplaced records.
            </p>
          ) : null}
        </WebsiteSection>
      ) : null}

      <WebsiteSection
        eyebrow="Calendar Health"
        title="Month summary"
        description="Use this to see whether the campaign month is properly filled and spaced."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Open Days</h3>
            <p className={websiteStyles.cardText}>
              {emptyDays} day(s) in this month have no campaign or content assigned.
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>All Loaded Records</h3>
            <p className={websiteStyles.cardText}>
              Loaded {campaigns.length} campaign(s), {allAssets.length} asset(s), and {allItems.length} planned item(s) before month filtering.
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Unplaced Records</h3>
            <p className={websiteStyles.cardText}>
              {unplacedRecords.length} loaded record(s) are missing usable calendar placement fields.
            </p>
          </article>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
