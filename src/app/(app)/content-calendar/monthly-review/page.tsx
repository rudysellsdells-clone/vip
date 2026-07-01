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

function metadataRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function shortText(value: unknown, fallback = "Not supplied") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function firstListItem(value: unknown, fallback = "Not supplied") {
  return Array.isArray(value) && value.length
    ? shortText(value[0], fallback)
    : fallback;
}

function marketingSpinesFromAssets(assets: Array<Record<string, any>>) {
  const map = new Map<string, Record<string, any>>();

  for (const asset of assets) {
    const metadata = metadataRecord(asset.metadata);
    const spine = metadataRecord(metadata.marketingSpine);
    const key = [
      shortText(spine.campaignObjective, ""),
      shortText(spine.audience, ""),
      shortText(spine.offer, ""),
      shortText(spine.originalityAngle, ""),
    ].join("|");

    if (key.replace(/\|/g, "").trim() && !map.has(key)) {
      map.set(key, spine);
    }
  }

  return Array.from(map.values()).slice(0, 6);
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
  const marketingSpines = marketingSpinesFromAssets(visibleAssets);

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
        eyebrow="Marketing Spine"
        title="Strategy bridge used by this review set"
        description="This shows the visible strategy spine that sat between campaign planning and asset execution. Generated assets should inherit this context through their asset briefs and quality review."
      >
        {marketingSpines.length ? (
          <div className={websiteStyles.cardGrid}>
            {marketingSpines.map((spine, index) => (
              <article key={`${shortText(spine.audience)}-${index}`} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <span className={websiteStyles.badge}>Marketing Spine</span>
                  <span className={websiteStyles.badge}>{shortText(spine.gateStatus, "saved")}</span>
                  <span className={websiteStyles.badge}>{shortText(spine.readinessScore, "?")}/100</span>
                </div>
                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 12 }}>
                  {shortText(spine.campaignObjective, "Campaign strategy")}
                </h3>
                <p className={websiteStyles.cardText}>
                  <strong>Audience:</strong> {shortText(spine.audience)}
                </p>
                <p className={websiteStyles.cardText}>
                  <strong>Offer:</strong> {shortText(spine.offer)}
                </p>
                <p className={websiteStyles.cardText}>
                  <strong>Originality angle:</strong> {shortText(spine.originalityAngle)}
                </p>
                <p className={websiteStyles.cardText}>
                  <strong>Proof:</strong> {firstListItem(spine.proofPoints)}
                </p>
                <p className={websiteStyles.cardText}>
                  <strong>CTA:</strong> {shortText(spine.primaryCta)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No Marketing Spine metadata found in this view yet. Generate a new month through the visible spine gate to populate this section.
          </div>
        )}
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