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
import { DeleteMonthlyCampaignButton } from "@/components/content-calendar/DeleteMonthlyCampaignButton";
import { getUserAccountContext } from "@/lib/accounts/account-context";
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

function uniqueRowsById(rows: Array<Record<string, any>>) {
  const map = new Map<string, Record<string, any>>();

  for (const row of rows) {
    const id = String(row.id ?? "");

    if (id && !map.has(id)) {
      map.set(id, row);
    }
  }

  return Array.from(map.values());
}

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

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;

  if (!activeAccountId) {
    redirect("/accounts");
  }

  const accountQuery = supabase
    .from("generated_assets")
    .select("*")
    .eq("account_id", activeAccountId)
    .order("scheduled_publish_at", { ascending: true, nullsFirst: false })
    .limit(1500);

  const legacyQuery = supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .is("account_id", null)
    .order("scheduled_publish_at", { ascending: true, nullsFirst: false })
    .limit(1500);

  const [accountResult, legacyResult] = await Promise.all([
    applyWorkingAssetQuery(accountQuery),
    accountContext.isMaster
      ? applyWorkingAssetQuery(legacyQuery)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const error = accountResult.error ?? legacyResult.error;
  const allWorkingAssets = filterWorkingAssets(
    uniqueRowsById([...safeRows(accountResult.data), ...safeRows(legacyResult.data)])
  );
  const legacyUnassignedCount = allWorkingAssets.filter((asset) => !asset.account_id).length;
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
        description={`Review active generated assets for ${accountContext.activeAccountName ?? "the active workspace"}. MASTER also sees unassigned legacy items so older generated content is not lost.`}
        primaryAction={{ label: "Calendar", href: "/content-calendar/monthly" }}
        secondaryAction={{ label: "Approvals", href: "/approvals" }}
      />

      <WebsiteSection
        eyebrow="Active Workspace"
        title={accountContext.activeAccountName ?? "Current workspace"}
        description="Monthly Review is now aligned with workspace-scoped approvals and publishing. Legacy unassigned items are shown to MASTER only for rescue and rerouting."
      >
        <article className={websiteStyles.card}>
          <div className="flex flex-wrap gap-2">
            <span className={websiteStyles.badge}>Workspace ID: {activeAccountId}</span>
            <span className={websiteStyles.badge}>Role: {accountContext.activeAccountRole ?? "member"}</span>
            {accountContext.isMaster ? <span className={websiteStyles.badge}>MASTER preview</span> : null}
            {legacyUnassignedCount ? <span className={websiteStyles.badge}>{legacyUnassignedCount} legacy unassigned item(s)</span> : null}
          </div>
        </article>
      </WebsiteSection>

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
        eyebrow="Cleanup"
        title="Remove monthly content"
        description="Remove the full monthly campaign package when you need to clear and regenerate the month."
      >
        <DeleteMonthlyCampaignButton month={range.monthValue} />
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