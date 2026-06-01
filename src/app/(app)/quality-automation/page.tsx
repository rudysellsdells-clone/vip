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
import {
  isQualityAutomationCandidate,
  pageVisibleAssets,
  safeRows,
} from "@/lib/calendar/page-assets";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QualityAutomationPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const range = buildCalendarViewRangeFromSearchParams({
    searchParams: resolvedSearchParams,
    defaultView: defaultViewForPage("quality-automation"),
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

  const allWorkingAssets = filterWorkingAssets(safeRows(data)).filter(isQualityAutomationCandidate);
  const { visibleAssets, groups } = pageVisibleAssets({
    assets: allWorkingAssets,
    range,
  });

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Quality Automation"
        title="Automated quality queue"
        description="Run quality automation against active latest-version content."
        primaryAction={{ label: "Content Quality", href: "/content-quality" }}
        secondaryAction={{ label: "Monthly Review", href: "/content-calendar/monthly-review" }}
      />

      <WebsiteSection
        eyebrow="View"
        title={range.label}
        description="Switch quality automation between daily, weekly, and monthly views."
      >
        <WorkingViewControls
          basePath="/quality-automation"
          range={range}
          visibleCount={visibleAssets.length}
          totalCount={allWorkingAssets.length}
          title="Quality automation view"
          visibleLabel="In View"
          totalLabel="Automation Queue"
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Queue"
        title={`${range.view === "day" ? "Daily" : range.view === "month" ? "Monthly" : "Weekly"} automation items`}
        description="Only working assets appear here."
      >
        {error ? (
          <div className={websiteStyles.empty}>{error.message}</div>
        ) : (
          <WorkingAssetGroups
            groups={groups}
            emptyMessage={`No automation items found in this ${range.view} view.`}
            extraLinks={(asset) => (
              <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                Review quality →
              </Link>
            )}
          />
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
