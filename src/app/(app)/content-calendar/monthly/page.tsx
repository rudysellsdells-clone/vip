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
import {
  buildCalendarViewRangeFromSearchParams,
} from "@/lib/calendar/view-range";
import { defaultViewForPage } from "@/lib/calendar/working-view-config";
import { pageVisibleAssets, safeRows } from "@/lib/calendar/page-assets";
import { GenerateMonthlyCampaignsButton } from "@/components/content-calendar/GenerateMonthlyCampaignsButton";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { fetchAccountMarketProfile } from "@/lib/accounts/account-market-profile";
import { buildBrandVoiceMonthlyOptions } from "@/lib/accounts/brand-voice-monthly-options";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MonthlyContentCalendarPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const range = buildCalendarViewRangeFromSearchParams({
    searchParams: resolvedSearchParams,
    defaultView: defaultViewForPage("content-calendar"),
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

  const marketProfile = await fetchAccountMarketProfile({
    supabase,
    accountId: activeAccountId,
  });

  const [{ data: cloneProfile }, { data: accountBrandProfile }, { data: brandRules }] = await Promise.all([
    supabase
      .from("digital_clone_profiles")
      .select("*")
      .eq("account_id", activeAccountId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("account_brand_profiles")
      .select("*")
      .eq("account_id", activeAccountId)
      .maybeSingle(),
    supabase
      .from("brand_rules")
      .select("rule_text,category,priority")
      .eq("account_id", activeAccountId)
      .eq("active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const brandVoiceOptions = buildBrandVoiceMonthlyOptions({
    cloneProfile,
    accountBrandProfile,
    brandRules: (brandRules ?? []) as Array<Record<string, unknown>>,
  });

  const baseQuery = supabase
    .from("generated_assets")
    .select("*")
    .eq("account_id", activeAccountId)
    .order("scheduled_publish_at", { ascending: true, nullsFirst: false })
    .limit(1500);

  const { data, error } = await applyWorkingAssetQuery(baseQuery);

  const allWorkingAssets = filterWorkingAssets(safeRows(data));
  const { visibleAssets, groups } = pageVisibleAssets({
    assets: allWorkingAssets,
    range,
  });

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Content Calendar"
        title="Monthly content calendar"
        description={`View active, latest-version content for ${accountContext.activeAccountName ?? "the active workspace"} by day, week, or month.`}
        primaryAction={{ label: "Monthly Review", href: "/content-calendar/monthly-review" }}
        secondaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
      />

      <WebsiteSection
        eyebrow="Generate"
        title="Create monthly campaign content"
        description="Generate one campaign per week for the active account workspace and place the assets into the working calendar."
      >
        <GenerateMonthlyCampaignsButton
          defaultMonth={range.monthValue}
          activeAccountId={activeAccountId}
          activeAccountName={accountContext.activeAccountName}
          marketProfile={marketProfile}
          brandVoiceOptions={brandVoiceOptions}
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="View"
        title={range.label}
        description="Switch the calendar between daily, weekly, and monthly working views."
      >
        <WorkingViewControls
          basePath="/content-calendar/monthly"
          range={range}
          visibleCount={visibleAssets.length}
          totalCount={allWorkingAssets.length}
          title="Calendar view"
          visibleLabel="In View"
          totalLabel="Calendar Items"
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Calendar"
        title={`${range.view === "day" ? "Daily" : range.view === "month" ? "Monthly" : "Weekly"} content view`}
        description="Only active latest-version assets for the active workspace appear here."
      >
        {error ? (
          <div className={websiteStyles.empty}>{error.message}</div>
        ) : (
          <WorkingAssetGroups
            groups={groups}
            emptyMessage={`No active content found in this ${range.view} view.`}
            extraLinks={(asset) => (
              <Link href={`/content-calendar/monthly-review?view=${range.view}&date=${range.dateValue}`} className={websiteStyles.link}>
                Review board →
              </Link>
            )}
          />
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
