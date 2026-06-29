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
import { applyWorkingAssetQuery, filterWorkingAssets } from "@/lib/assets/asset-visibility";
import { buildCalendarViewRangeFromSearchParams } from "@/lib/calendar/view-range";
import { defaultViewForPage } from "@/lib/calendar/working-view-config";
import { isQualityCandidate, pageVisibleAssets, safeRows } from "@/lib/calendar/page-assets";
import { loadLatestQualityReviewsByAssetId } from "@/lib/content-quality/load-quality-reviews";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContentQualityPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const range = buildCalendarViewRangeFromSearchParams({
    searchParams: resolvedSearchParams,
    defaultView: defaultViewForPage("content-quality"),
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

  const allWorkingAssets = filterWorkingAssets(safeRows(data)).filter(isQualityCandidate);
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
        eyebrow="Content Quality"
        title="Quality review queue"
        description="Review quality scores, pass/fail status, and improvement notes across active content."
        primaryAction={{ label: "Approvals", href: "/approvals" }}
        secondaryAction={{ label: "Content Calendar", href: "/content-calendar" }}
      />

      <WebsiteSection
        eyebrow="View"
        title={range.label}
        description="Switch quality review between daily, weekly, and monthly views."
      >
        <WorkingViewControls
          basePath="/content-quality"
          range={range}
          visibleCount={visibleAssets.length}
          totalCount={allWorkingAssets.length}
          title="Quality view"
          visibleLabel="In View"
          totalLabel="Quality Queue"
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Queue"
        title={`${range.view === "day" ? "Daily" : range.view === "month" ? "Monthly" : "Weekly"} quality items`}
        description="Each card shows whether the asset was quality tested and the latest saved score."
      >
        {error ? (
          <div className={websiteStyles.empty}>{error.message}</div>
        ) : (
          <WorkingAssetGroups
            groups={groups}
            reviewsByAssetId={reviewsByAssetId}
            compactQuality={false}
            emptyMessage={`No quality items found in this ${range.view} view.`}
            extraLinks={(asset) => (
              <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                Score →
              </Link>
            )}
          />
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
