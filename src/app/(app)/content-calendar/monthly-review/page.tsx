import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewMonthSelector } from "@/components/content-calendar/ReviewMonthSelector";
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
  const status = String(asset.status ?? "needs_review");
  const hasSchedule = Boolean(asset.scheduled_publish_at || asset.planned_publish_date);

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
  const allAssets = safeRows(assetsData);
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
  const groups = groupAssetsByCampaign({
    assets,
    campaigns: monthCampaigns.length ? monthCampaigns : campaigns,
  });

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Monthly Campaign Review"
        title={`${monthLabel(selectedMonth)} review board`}
        description="Review generated campaign assets by week, campaign, status, asset type, and schedule readiness before moving into approvals and publishing."
        primaryAction={{ label: "Monthly Calendar", href: `/content-calendar/monthly?month=${selectedMonth}` }}
        secondaryAction={{ label: "Quality Automation", href: "/quality-automation" }}
      />

      <WebsiteSection
        eyebrow="Control"
        title="Choose review month"
        description="Use this board after monthly generation to inspect the campaign package before approval and publishing."
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
        </div>
      </WebsiteSection>

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Total Assets"
          value={counts.total}
          description="Generated assets in this month."
          dot="blue"
        />
        <WebsiteMetric
          label="Needs Review"
          value={counts.needsReview}
          description="Assets still waiting on review."
          dot="gold"
        />
        <WebsiteMetric
          label="Approved"
          value={counts.approved}
          description="Approved assets ready for downstream scheduling/publishing."
          dot="green"
        />
        <WebsiteMetric
          label="Unscheduled"
          value={counts.unscheduled}
          description="Assets missing a planned or scheduled date."
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
        description="Open individual assets for review, revisions, approval, or publishing workflow steps."
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
