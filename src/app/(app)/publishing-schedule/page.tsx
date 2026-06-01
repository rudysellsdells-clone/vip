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
import { buildCalendarViewRangeFromSearchParams } from "@/lib/calendar/view-range";
import { defaultViewForPage } from "@/lib/calendar/working-view-config";
import {
  filterPublishingAssetsByViewRange,
  groupPublishingAssetsByDay,
  publishingDateLabel,
} from "@/lib/calendar/publishing-schedule-view";
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

function hasPublishDate(asset: Record<string, any>) {
  return Boolean(asset.scheduled_publish_at ?? asset.planned_publish_date);
}

function preview(content: unknown, length = 180) {
  const text = String(content ?? "").replace(/\s+/g, " ").trim();

  if (!text) return "No content preview available.";

  return `${text.slice(0, length)}${text.length > length ? "..." : ""}`;
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

  const allApprovedActiveAssets = filterPublishingScheduleAssets(safeRows(data));
  const visibleAssets = filterPublishingAssetsByViewRange(allApprovedActiveAssets, range, {
    includeUnscheduled: true,
  });
  const groups = groupPublishingAssetsByDay(visibleAssets);
  const unscheduledCount = allApprovedActiveAssets.filter((asset) => !hasPublishDate(asset)).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publishing Schedule"
        title="Approved content ready to publish"
        description="Approved content appears here whether it is scheduled for a date or ready to publish now. No-date assets are grouped separately so they do not look like they are scheduled for today."
        primaryAction={{ label: "Published", href: "/published" }}
        secondaryAction={{ label: "Monthly Calendar", href: "/content-calendar/monthly" }}
      />

      <WebsiteSection
        eyebrow="View"
        title={range.label}
        description="Daily, weekly, and monthly views apply to dated assets. Unscheduled approved assets stay visible in the Publish Now group."
      >
        <WorkingViewControls
          basePath="/publishing-schedule"
          range={range}
          visibleCount={visibleAssets.length}
          totalCount={allApprovedActiveAssets.length}
          title="Publishing view"
          visibleLabel="In View"
          totalLabel="Approved Queue"
        />
      </WebsiteSection>

      {unscheduledCount ? (
        <WebsiteSection
          eyebrow="Publish Now"
          title={`${unscheduledCount} approved item(s) have no publish date`}
          description="These are not broken. They are approved assets without a scheduled date, so they can be sent manually or assigned a schedule."
        >
          <div className={websiteStyles.card}>
            <p className={websiteStyles.cardText}>
              If an item is approved and appears here, it should be publishable. Use the “Send to Zapier” action to open the execution flow.
            </p>
          </div>
        </WebsiteSection>
      ) : null}

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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={websiteStyles.cardTitle}>{group.label}</h3>
                  <span className={websiteStyles.badge}>{group.assets.length} item(s)</span>
                </div>

                {group.isUnscheduled ? (
                  <p className={websiteStyles.cardMeta} style={{ marginTop: 8 }}>
                    These approved assets have no publish date. They are still eligible for manual publishing/Zapier execution.
                  </p>
                ) : null}

                <div className={websiteStyles.cardGrid} style={{ marginTop: 16 }}>
                  {group.assets.map((asset) => (
                    <article key={asset.id} className={websiteStyles.card}>
                      <div className="flex flex-wrap gap-2">
                        <WebsiteBadge status={asset.status ?? "approved"} />
                        <span className={websiteStyles.badge}>{assetTypeLabel(asset.asset_type)}</span>
                        <span className={websiteStyles.badge}>{publishingDateLabel(asset)}</span>
                        {!hasPublishDate(asset) ? (
                          <span className={websiteStyles.badge}>Manual publish</span>
                        ) : null}
                      </div>

                      <h4 className={websiteStyles.cardTitle} style={{ marginTop: 14, fontSize: 16 }}>
                        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                          {asset.title}
                        </Link>
                      </h4>

                      <p className={websiteStyles.cardText}>{preview(asset.content)}</p>

                      <div className={websiteStyles.actionRow}>
                        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                          Open →
                        </Link>
                        <Link href={`/publishing-ready?asset=${asset.id}`} className={websiteStyles.link}>
                          Send to Zapier →
                        </Link>
                        {!hasPublishDate(asset) ? (
                          <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                            Add date →
                          </Link>
                        ) : null}
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
