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
import { isApprovalCandidate, pageVisibleAssets, safeRows } from "@/lib/calendar/page-assets";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ApprovalsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const range = buildCalendarViewRangeFromSearchParams({
    searchParams: resolvedSearchParams,
    defaultView: defaultViewForPage("approvals"),
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

  const allWorkingAssets = filterWorkingAssets(safeRows(data)).filter(isApprovalCandidate);
  const { visibleAssets, groups } = pageVisibleAssets({
    assets: allWorkingAssets,
    range,
  });

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Approvals"
        title="Approval queue"
        description="Approve only the active latest version of each asset."
        primaryAction={{ label: "Monthly Review", href: "/content-calendar/monthly-review" }}
        secondaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
      />

      <WebsiteSection
        eyebrow="View"
        title={range.label}
        description="Switch the approval queue between daily, weekly, and monthly views."
      >
        <WorkingViewControls
          basePath="/approvals"
          range={range}
          visibleCount={visibleAssets.length}
          totalCount={allWorkingAssets.length}
          title="Approval view"
          visibleLabel="In View"
          totalLabel="Approval Queue"
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Queue"
        title={`${range.view === "day" ? "Daily" : range.view === "month" ? "Monthly" : "Weekly"} approval queue`}
        description="Old versions and already-published assets are hidden."
      >
        {error ? (
          <div className={websiteStyles.empty}>{error.message}</div>
        ) : (
          <WorkingAssetGroups
            groups={groups}
            emptyMessage={`No approval items found in this ${range.view} view.`}
            extraLinks={(asset) => (
              <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                Approve →
              </Link>
            )}
          />
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
