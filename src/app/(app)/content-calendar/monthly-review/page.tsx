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
import { BulkQualityReviewButton } from "@/components/content-calendar/BulkQualityReviewButton";
import { applyWorkingAssetQuery, filterWorkingAssets } from "@/lib/assets/asset-visibility";
import { buildCalendarViewRangeFromSearchParams } from "@/lib/calendar/view-range";
import { defaultViewForPage } from "@/lib/calendar/working-view-config";
import { pageVisibleAssets, safeRows } from "@/lib/calendar/page-assets";
import { loadLatestQualityReviewsByAssetId } from "@/lib/content-quality/load-quality-reviews";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MonthlyReviewPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const range = buildCalendarViewRangeFromSearchParams({
    searchParams: resolvedSearchParams,
    defaultView: defaultViewForPage("monthly-review"),
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
    .limit(1500);

  const { data, error } = await applyWorkingAssetQuery(baseQuery);

  const allWorkingAssets = filterWorkingAssets(safeRows(data));
  const { visibleAssets, groups } = pageVisibleAssets({
    assets: allWorkingAssets,
    range,
  });

  const reviewsByAssetId = await loadLatestQualityReviewsByAssetId({
    supabase,
    userId: user.id,
    assetIds: visibleAssets.map((asset) => String(asset.id)),
  });

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Monthly Review"
        title="Campaign review board"
        description="Review active generated assets with visible quality status and score evidence."
        primaryAction={{ label: "Calendar", href: "/content-calendar/monthly" }}
        secondaryAction={{ label: "Approvals", href: "/approvals" }}
      />

      <WebsiteSection
        eyebrow="View"
        title={range.label}
        description="Switch the review board between daily, weekly, and monthly views."
      >
        <WorkingViewControls
          basePath="/content-calendar/monthly-review"
          range={range}
          visibleCount={visibleAssets.length}
          totalCount={allWorkingAssets.length}
          title="Review board view"
          visibleLabel="In View"
          totalLabel="Review Items"
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Quality"
        title="Bulk quality review"
        description="Run quality review for active latest-version assets in this month."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <BulkQualityReviewButton month={range.monthValue} />
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Assets"
        title={`${range.view === "day" ? "Daily" : range.view === "month" ? "Monthly" : "Weekly"} review items`}
        description="Each card shows the latest quality result when available."
      >
        {error ? (
          <div className={websiteStyles.empty}>{error.message}</div>
        ) : (
          <WorkingAssetGroups
            groups={groups}
            reviewsByAssetId={reviewsByAssetId}
            compactQuality={true}
            emptyMessage={`No review items found in this ${range.view} view.`}
            extraLinks={(asset) => (
              <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                Review →
              </Link>
            )}
          />
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
