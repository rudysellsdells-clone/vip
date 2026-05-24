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

  const allEntries = [
    ...campaigns
      .map(calendarEntryFromCampaign)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    ...allItems
      .map((item) => calendarEntryFromItem({ item, campaignById }))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    ...allAssets
      .map((asset) => calendarEntryFromAsset({ asset, campaignById }))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
  ];

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
        description="View campaigns, planned content, and generated assets by intended publish month. The month picker now includes rolling months and detected content months."
        primaryAction={{ label: "Content Calendar", href: "/content-calendar" }}
        secondaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
      />

      <WebsiteSection
        eyebrow="Month"
        title="Select or generate a campaign month"
        description="If generated content is missing calendar fields, this view falls back to campaign month, campaign week, scheduled date, and then creation date."
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
          label="Campaigns"
          value={campaignCount}
          description="Weekly campaign containers in this month."
          dot="green"
        />
        <WebsiteMetric
          label="Generated Assets"
          value={generatedCount}
          description="Assets generated under campaigns or plans."
          dot="gold"
        />
        <WebsiteMetric
          label="Detected Months"
          value={contentMonths.length}
          description="Months detected from campaign/content metadata."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Calendar"
        title="Monthly view"
        description="Campaigns appear on week start days. Generated assets appear on planned publish dates, scheduled dates, or campaign fallback dates."
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
            <h3 className={websiteStyles.cardTitle}>Best Next Step</h3>
            <p className={websiteStyles.cardText}>
              If a month still looks empty, run the backfill SQL so existing assets inherit campaign month and week fields.
            </p>
          </article>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
