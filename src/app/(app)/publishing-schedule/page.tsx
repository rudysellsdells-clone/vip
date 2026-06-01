import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkingViewControls } from "@/components/calendar/WorkingViewControls";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import {
  applyPublishingScheduleQuery,
  filterPublishingScheduleAssets,
} from "@/lib/assets/asset-visibility";
import {
  buildCalendarViewRangeFromSearchParams,
  dateTimeLabel,
  filterAssetsByViewRange,
  groupAssetsByDay,
} from "@/lib/calendar/view-range";
import { defaultViewForPage } from "@/lib/calendar/working-view-config";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function safeRows(data: unknown) {
  return (Array.isArray(data) ? data : []) as Array<Record<string, any>>;
}

function assetTypeLabel(value: unknown) {
  return String(value ?? "asset").replaceAll("_", " ");
}

export default async function PublishingSchedulePage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const range = buildCalendarViewRangeFromSearchParams({
    searchParams: resolvedSearchParams,
    defaultView: defaultViewForPage("publishing-schedule"),
  });

  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const baseQuery = supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .order("scheduled_publish_at", { ascending: true, nullsFirst: false })
    .limit(1000);

  const { data, error } = await applyPublishingScheduleQuery(baseQuery);

  const allWorkingAssets = filterPublishingScheduleAssets(safeRows(data));
  const visibleAssets = filterAssetsByViewRange(allWorkingAssets, range);
  const groups = groupAssetsByDay(visibleAssets);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publishing Schedule"
        title="Approved content ready to publish"
        description="Only approved, active, latest-version content appears here. Use the view selector to focus by day, week, or month."
        primaryAction={{ label: "Published", href: "/published" }}
        secondaryAction={{ label: "Monthly Calendar", href: "/content-calendar/monthly" }}
      />

      <WebsiteSection
        eyebrow="View"
        title={range.label}
        description="Daily, weekly, and monthly views keep the publishing queue from getting too busy."
      >
        <WorkingViewControls
          basePath="/publishing-schedule"
          range={range}
          visibleCount={visibleAssets.length}
          totalCount={allWorkingAssets.length}
          title="Publishing view"
          visibleLabel="In View"
          totalLabel="Approved Queue"
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Queue"
        title={`${range.view === "day" ? "Daily" : range.view === "month" ? "Monthly" : "Weekly"} publishing queue`}
        description="Once an asset is sent to Zapier and marked published, it leaves this queue."
      >
        {error ? (
          <div className={websiteStyles.empty}>{error.message}</div>
        ) : groups.length ? (
          <div className="grid gap-5">
            {groups.map((group) => (
              <section key={group.key} className={websiteStyles.card}>
                <h3 className={websiteStyles.cardTitle}>{group.label}</h3>

                <div className={websiteStyles.cardGrid} style={{ marginTop: 16 }}>
                  {group.assets.map((asset) => (
                    <article key={asset.id} className={websiteStyles.card}>
                      <div className="flex flex-wrap gap-2">
                        <WebsiteBadge status={asset.status ?? "approved"} />
                        <span className={websiteStyles.badge}>{assetTypeLabel(asset.asset_type)}</span>
                        <span className={websiteStyles.badge}>
                          {dateTimeLabel(asset.scheduled_publish_at ?? asset.planned_publish_date)}
                        </span>
                      </div>

                      <h4 className={websiteStyles.cardTitle} style={{ marginTop: 14, fontSize: 16 }}>
                        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                          {asset.title}
                        </Link>
                      </h4>

                      <p className={websiteStyles.cardText}>
                        {String(asset.content ?? "").replace(/\s+/g, " ").slice(0, 180)}
                        {String(asset.content ?? "").length > 180 ? "..." : ""}
                      </p>

                      <div className={websiteStyles.actionRow}>
                        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                          Open →
                        </Link>
                        <Link href={`/publishing-ready?asset=${asset.id}`} className={websiteStyles.link}>
                          Send / execute →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No approved active assets are scheduled in this {range.view} view.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
