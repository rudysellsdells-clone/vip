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

function currentMonthValue(searchParams: Record<string, string | string[] | undefined>) {
  return parseMonthValue(firstValue(searchParams.month)).value;
}

function safeRows(data: unknown) {
  return (Array.isArray(data) ? data : []) as Array<Record<string, any>>;
}

export default async function MonthlyContentCalendarPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedMonth = currentMonthValue(resolvedSearchParams);

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
        .order("campaign_week_start_date", { ascending: false, nullsFirst: false })
        .limit(300),
      supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("content_calendar_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  const campaigns = safeRows(campaignsData);
  const allAssets = safeRows(allAssetsData);
  const allItems = safeRows(allItemsData);

  const campaignById = new Map<string, Record<string, any>>(
    campaigns.map((campaign) => [String(campaign.id), campaign])
  );

  const monthOptions = buildMonthOptionsFromRows([...campaigns, ...allAssets, ...allItems]);
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

  const entries = [
    ...campaigns
      .map(calendarEntryFromCampaign)
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    ...allItems
      .map((item) => calendarEntryFromItem({ item, campaignById }))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    ...allAssets
      .map((asset) => calendarEntryFromAsset({ asset, campaignById }))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
  ].filter((entry) => belongsToSelectedMonth(entry, selectedMonth));

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
        description="View campaigns, planned content, and generated assets by intended publish month instead of creation date."
        primaryAction={{ label: "Content Calendar", href: "/content-calendar" }}
        secondaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
      />

      <WebsiteSection
        eyebrow="Month"
        title="Select or generate a campaign month"
        description="The dropdown now pulls from campaigns, planned items, generated assets, intended month, planned date, and scheduled publish dates."
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
          description="Campaigns, planned items, and generated assets."
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
          label="Timed"
          value={scheduledCount}
          description="Items with a specific scheduled time."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Calendar"
        title="Monthly view"
        description="Campaigns appear on week start days. Generated assets appear on their planned publish dates and include campaign labels."
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
            <h3 className={websiteStyles.cardTitle}>Expected Weekly Package</h3>
            <p className={websiteStyles.cardText}>
              Each generated weekly campaign creates 1 blog post, 5 LinkedIn posts, 5 Facebook posts, 1 email, and 1 video script.
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Best Next Step</h3>
            <p className={websiteStyles.cardText}>
              Generate the monthly campaigns here, then use Publishing Schedule to fine-tune exact times before approvals and execution.
            </p>
          </article>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
