import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewMonthSelector } from "@/components/content-calendar/ReviewMonthSelector";
import { RunAutoQualityGateButton } from "@/components/content-calendar/RunAutoQualityGateButton";
import { MonthlyReviewStatusCard } from "@/components/content-calendar/MonthlyReviewStatusCard";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import {
  assetTypeLabel,
  buildMonthOptions,
  calculateCounts,
  dateLabel,
  groupAssetsByCampaign,
  monthCandidate,
  monthLabel,
  monthValueFromDate,
  parseMonthValue,
  statusLabel,
} from "@/lib/content-calendar/monthly-review";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function safeRows(data: unknown) {
  return (Array.isArray(data) ? data : []) as Array<Record<string, any>>;
}

function selectedMonthValue(searchParams: Record<string, string | string[] | undefined>) {
  const requested = firstValue(searchParams.month);

  if (requested) return parseMonthValue(requested).value;

  return monthValueFromDate(new Date());
}

function assetPreview(content: unknown) {
  const text = String(content ?? "").replace(/\s+/g, " ").trim();

  if (!text) return "No content preview available.";

  return `${text.slice(0, 180)}${text.length > 180 ? "..." : ""}`;
}

function campaignLabel(campaign: Record<string, any> | null, fallback: string) {
  return campaign?.name ?? campaign?.title ?? fallback;
}

function assetHealthLabel(asset: Record<string, any>) {
  const qualityStatus = String(asset.quality_workflow_status ?? "not_checked");
  const status = String(asset.status ?? "needs_review");
  const hasSchedule = Boolean(asset.scheduled_publish_at || asset.planned_publish_date);

  if (qualityStatus === "review_ready") return "Quality passed";
  if (qualityStatus === "needs_human_review_after_quality") return "Needs human review";
  if (qualityStatus === "auto_regenerated_from_failed_quality") return "Superseded";
  if (qualityStatus === "not_checked") return "Not quality checked";
  if (status === "approved" && hasSchedule) return "Ready downstream";
  if (status === "approved" && !hasSchedule) return "Approved, needs schedule";
  if (status === "needs_review") return "Needs review";
  if (status === "rejected") return "Rejected";
  return statusLabel(status);
}

export default async function MonthlyCampaignReviewPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedMonth = selectedMonthValue(resolvedSearchParams);

  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: campaignsData }, { data: assetsData }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("campaign_week_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("generated_assets")
      .select("*")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("campaign_week_number", { ascending: true, nullsFirst: false })
      .order("calendar_sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const campaigns = safeRows(campaignsData);
  const loadedAssets = safeRows(assetsData);
  const allAssets = loadedAssets.filter((asset) => asset.is_active_version !== false);
  const monthOptions = buildMonthOptions([...campaigns, ...allAssets]);
  const selectedInOptions = monthOptions.some((option) => option.value === selectedMonth);
  const options = selectedInOptions
    ? monthOptions
    : [
        {
          value: selectedMonth,
          label: monthLabel(selectedMonth),
        },
        ...monthOptions,
      ].sort((a, b) => a.value.localeCompare(b.value));

  const monthCampaigns = campaigns.filter((campaign) => monthCandidate(campaign) === selectedMonth);
  const campaignIds = new Set(monthCampaigns.map((campaign) => String(campaign.id)));

  const assets = allAssets.filter((asset) => {
    const directMonth = monthCandidate(asset);

    if (directMonth === selectedMonth) return true;

    return asset.campaign_id && campaignIds.has(String(asset.campaign_id));
  });

  const counts = calculateCounts(assets);
  const qualityNotChecked = assets.filter((asset) => String(asset.quality_workflow_status ?? "not_checked") === "not_checked").length;
  const qualityPassed = assets.filter((asset) => String(asset.quality_workflow_status ?? "") === "review_ready").length;
  const qualityNeedsHuman = assets.filter((asset) => String(asset.quality_workflow_status ?? "") === "needs_human_review_after_quality").length;
  const groups = groupAssetsByCampaign({
    assets,
    campaigns: monthCampaigns.length ? monthCampaigns : campaigns,
  });

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Monthly Campaign Review"
        title={`${monthLabel(selectedMonth)} review board`}
        description="Run auto quality scoring before human review, then inspect the best active asset version by week, campaign, status, and schedule readiness."
        primaryAction={{ label: "Monthly Calendar", href: `/content-calendar/monthly?month=${selectedMonth}` }}
        secondaryAction={{ label: "Quality Automation", href: "/quality-automation" }}
      />

      <WebsiteSection
        eyebrow="Control"
        title="Choose review month"
        description="Use this board after monthly generation to score and inspect the campaign package before approval and publishing."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <ReviewMonthSelector value={selectedMonth} options={options} />

            <div className={websiteStyles.actionRow} style={{ marginTop: 16 }}>
              <Link href={`/content-calendar/monthly?month=${selectedMonth}`} className={websiteStyles.link}>
                Open monthly calendar →
              </Link>
              <Link href="/approvals" className={websiteStyles.link}>
                Open approvals →
              </Link>
              <Link href="/publishing-schedule" className={websiteStyles.link}>
                Open publishing schedule →
              </Link>
            </div>
          </article>

          <MonthlyReviewStatusCard counts={counts} />

          <article className={websiteStyles.card}>
            <RunAutoQualityGateButton month={selectedMonth} />
          </article>
        </div>
      </WebsiteSection>

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Total Assets"
          value={counts.total}
          description="Active generated assets in this month."
          dot="blue"
        />
        <WebsiteMetric
          label="Not Scored"
          value={qualityNotChecked}
          description="Assets still waiting on auto quality scoring."
          dot="gold"
        />
        <WebsiteMetric
          label="Quality Passed"
          value={qualityPassed}
          description="Assets that passed the pre-review quality gate."
          dot="green"
        />
        <WebsiteMetric
          label="Needs Human"
          value={qualityNeedsHuman}
          description="Assets that failed after auto-regeneration limit."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Channel Mix"
        title="Monthly asset mix"
        description="Quick check that the weekly campaign package created the expected types."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>LinkedIn</h3>
            <p className={websiteStyles.cardText}>{counts.linkedin} post(s)</p>
          </article>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Facebook</h3>
            <p className={websiteStyles.cardText}>{counts.facebook} post(s)</p>
          </article>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Blog</h3>
            <p className={websiteStyles.cardText}>{counts.blog} post(s)</p>
          </article>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Email / Video</h3>
            <p className={websiteStyles.cardText}>
              {counts.email} email(s) • {counts.video} video script(s)
            </p>
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Campaigns"
        title="Weekly campaign review"
        description="The board shows active versions only. Failed originals that were auto-regenerated stay traceable but do not clutter review."
      >
        {groups.length ? (
          <div className="grid gap-5">
            {groups.map((group) => (
              <article key={group.campaignId} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <span className={websiteStyles.badge}>
                    Week {group.weekNumber === 99 ? "?" : group.weekNumber}
                  </span>
                  <span className={websiteStyles.badge}>{group.counts.total} asset(s)</span>
                  <span className={websiteStyles.badge}>{group.counts.needsReview} need review</span>
                  <span className={websiteStyles.badge}>{group.counts.approved} approved</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  {campaignLabel(group.campaign, group.label)}
                </h3>

                {group.campaign?.idea ? (
                  <p className={websiteStyles.cardText}>{group.campaign.idea}</p>
                ) : null}

                <div className={websiteStyles.cardGrid} style={{ marginTop: 16 }}>
                  {group.assets.map((asset) => (
                    <article key={asset.id} className={websiteStyles.card}>
                      <div className="flex flex-wrap gap-2">
                        <WebsiteBadge status={asset.status ?? "needs_review"} />
                        <span className={websiteStyles.badge}>{assetTypeLabel(asset.asset_type)}</span>
                        <span className={websiteStyles.badge}>{assetHealthLabel(asset)}</span>
                      </div>

                      <h4 className={websiteStyles.cardTitle} style={{ marginTop: 14, fontSize: 16 }}>
                        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                          {asset.title}
                        </Link>
                      </h4>

                      <p className={websiteStyles.cardMeta}>
                        Scheduled: {dateLabel(asset.scheduled_publish_at ?? asset.planned_publish_date)}
                      </p>

                      <p className={websiteStyles.cardText}>{assetPreview(asset.content)}</p>

                      <div className={websiteStyles.actionRow}>
                        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                          Open →
                        </Link>
                        <Link href="/content-quality" className={websiteStyles.link}>
                          Quality →
                        </Link>
                        <Link href="/approvals" className={websiteStyles.link}>
                          Approvals →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No campaign assets found for {monthLabel(selectedMonth)}.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
