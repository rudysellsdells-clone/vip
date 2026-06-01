import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkingViewControls } from "@/components/calendar/WorkingViewControls";
import { WorkingAssetGroups } from "@/components/calendar/WorkingAssetGroups";
import {
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
import { pageVisibleAssets, safeRows } from "@/lib/calendar/page-assets";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PublishingReadyPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const range = buildCalendarViewRangeFromSearchParams({
    searchParams: resolvedSearchParams,
    defaultView: defaultViewForPage("publishing-ready"),
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
  const { visibleAssets, groups } = pageVisibleAssets({
    assets: allWorkingAssets,
    range,
  });

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publishing Ready"
        title="Ready to send"
        description="Approved active assets that are ready for execution or Zapier handoff."
        primaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
        secondaryAction={{ label: "Published", href: "/published" }}
      />

      <WebsiteSection
        eyebrow="View"
        title={range.label}
        description="Switch publishing-ready items between daily, weekly, and monthly views."
      >
        <WorkingViewControls
          basePath="/publishing-ready"
          range={range}
          visibleCount={visibleAssets.length}
          totalCount={allWorkingAssets.length}
          title="Publishing-ready view"
          visibleLabel="In View"
          totalLabel="Ready Items"
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Queue"
        title={`${range.view === "day" ? "Daily" : range.view === "month" ? "Monthly" : "Weekly"} ready items`}
        description="Published assets leave this view after Zapier succeeds."
      >
        {error ? (
          <div className={websiteStyles.empty}>{error.message}</div>
        ) : (
          <WorkingAssetGroups
            groups={groups}
            emptyMessage={`No publishing-ready items found in this ${range.view} view.`}
            extraLinks={(asset) => (
              <Link href={`/publishing-ready?asset=${asset.id}`} className={websiteStyles.link}>
                Send →
              </Link>
            )}
          />
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
