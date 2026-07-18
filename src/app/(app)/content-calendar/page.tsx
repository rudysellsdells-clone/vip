import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentCommandCenterMonthSelector } from "@/components/content-calendar/ContentCommandCenterMonthSelector";
import { DeleteMonthlyCampaignButton } from "@/components/content-calendar/DeleteMonthlyCampaignButton";
import {
  WebsiteHero,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeMonth(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}$/.test(text)) return text;

  return currentMonthValue();
}

function monthStart(month: string) {
  return `${month}-01`;
}

function safeRows(data: unknown) {
  return (Array.isArray(data) ? data : []) as Array<Record<string, any>>;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1, 12, 0, 0, 0);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function dateLabel(value: unknown) {
  if (!value) return "Unknown date";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function activityTypeLabel(value: unknown) {
  const text = String(value ?? "activity")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!text) return "Activity";

  return text
    .split(" ")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function activityDescription(item: Record<string, any>) {
  return String(item.description ?? item.metadata?.message ?? "No description provided.").trim();
}

function assetMonth(asset: Record<string, any>) {
  const values = [
    asset.intended_publish_month,
    asset.scheduled_publish_at,
    asset.planned_publish_date,
    asset.campaign_week_start_date,
    asset.created_at,
  ];

  for (const value of values) {
    if (!value) continue;

    const text = String(value);

    if (/^\d{4}-\d{2}/.test(text)) {
      return text.slice(0, 7);
    }

    const date = new Date(text);

    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
  }

  return null;
}

function isLatestVisibleAsset(asset: Record<string, any>) {
  if (asset.archived_at) return false;
  if (asset.is_active_version === false) return false;
  if (asset.superseded_by_asset_id) return false;
  return true;
}

function isPublishedAsset(asset: Record<string, any>) {
  return (
    String(asset.status ?? "") === "published" ||
    String(asset.scheduling_status ?? "") === "published" ||
    Boolean(asset.published_at)
  );
}

function isWorkingAsset(asset: Record<string, any>) {
  if (!isLatestVisibleAsset(asset)) return false;
  if (isPublishedAsset(asset)) return false;
  return true;
}

function metricCard({
  label,
  value,
  description,
  href,
}: {
  label: string;
  value: number | string;
  description: string;
  href?: string;
}) {
  const content = (
    <article className={websiteStyles.card}>
      <p className={websiteStyles.cardMeta}>{label}</p>
      <h3 className={websiteStyles.cardTitle} style={{ fontSize: 34, marginTop: 6 }}>
        {value}
      </h3>
      <p className={websiteStyles.cardText}>{description}</p>
    </article>
  );

  if (!href) return content;

  return (
    <Link href={href} className={websiteStyles.link} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}


export default async function ContentCalendarCommandCenterPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const month = normalizeMonth(firstValue(resolvedSearchParams.month));
  const monthDate = monthStart(month);
  const prettyMonth = monthLabel(month);

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

  const { data: campaignData } = await supabase
    .from("campaigns")
    .select("*")
    .eq("account_id", activeAccountId)
    .eq("campaign_month", month)
    .order("campaign_week_number", { ascending: true });

  const { data: assetData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("account_id", activeAccountId)
    .order("scheduled_publish_at", { ascending: true, nullsFirst: false })
    .limit(2000);

  const { data: activityData } = await supabase
    .from("activity_log")
    .select("*")
    .eq("account_id", activeAccountId)
    .order("created_at", { ascending: false })
    .limit(8);

  const campaigns = safeRows(campaignData).filter((campaign) => !campaign.archived_at);
  const allAssets = safeRows(assetData);
  const monthAssets = allAssets.filter((asset) => assetMonth(asset) === month);
  const workingAssets = monthAssets.filter(isWorkingAsset);
  const latestAssets = monthAssets.filter(isLatestVisibleAsset);
  const publishedAssets = monthAssets.filter(isPublishedAsset);

  const needsQuality = workingAssets.filter((asset) => {
    const quality = String(asset.quality_workflow_status ?? "not_checked");
    const status = String(asset.status ?? "needs_review");

    return status !== "approved" && ["not_checked", "needs_human_review_after_quality"].includes(quality);
  });

  const reviewReady = workingAssets.filter((asset) => {
    const quality = String(asset.quality_workflow_status ?? "");
    const status = String(asset.status ?? "needs_review");

    return status !== "approved" && quality === "review_ready";
  });

  const approvedAssets = workingAssets.filter((asset) => String(asset.status ?? "") === "approved");

  const readyToPublish = approvedAssets.filter((asset) => {
    return !isPublishedAsset(asset);
  });

  const unplacedAssets = workingAssets.filter((asset) => {
    return !asset.scheduled_publish_at && !asset.planned_publish_date && !asset.campaign_week_start_date;
  });

  const supersededStillActive = monthAssets.filter((asset) => {
    return asset.superseded_by_asset_id && asset.is_active_version !== false && !asset.archived_at;
  });

  const approvedMissingDate = approvedAssets.filter((asset) => {
    return !asset.scheduled_publish_at && !asset.planned_publish_date;
  });

  const healthWarnings = [
    unplacedAssets.length
      ? `${unplacedAssets.length} active asset(s) do not have enough calendar metadata.`
      : "",
    supersededStillActive.length
      ? `${supersededStillActive.length} superseded asset(s) still appear active.`
      : "",
    approvedMissingDate.length
      ? `${approvedMissingDate.length} approved asset(s) are missing publish dates.`
      : "",
    campaigns.length === 0
      ? `No campaigns have been generated for ${prettyMonth}.`
      : "",
    campaigns.length > 0 && workingAssets.length === 0
      ? `Campaigns exist for ${prettyMonth}, but no active working assets are visible.`
      : "",
  ].filter(Boolean);

  const nextActions = [
    campaigns.length === 0
      ? {
          title: "Generate this month’s campaign package",
          description: `No campaigns exist for ${prettyMonth}. Start by generating the monthly package.`,
          href: `/content-calendar/monthly?view=month&date=${monthDate}`,
          cta: "Open Generator",
        }
      : null,
    needsQuality.length
      ? {
          title: "Run or review quality scoring",
          description: `${needsQuality.length} active asset(s) need quality review or human follow-up.`,
          href: `/content-quality?view=month&date=${monthDate}`,
          cta: "Open Quality",
        }
      : null,
    reviewReady.length
      ? {
          title: "Approve review-ready content",
          description: `${reviewReady.length} asset(s) are review-ready and waiting for approval.`,
          href: `/approvals?view=month&date=${monthDate}`,
          cta: "Open Approvals",
        }
      : null,
    readyToPublish.length
      ? {
          title: "Publish approved content",
          description: `${readyToPublish.length} approved asset(s) are waiting in the publishing queue.`,
          href: `/publishing-schedule?view=week&date=${monthDate}`,
          cta: "Open Schedule",
        }
      : null,
    healthWarnings.length
      ? {
          title: "Review content health warnings",
          description: `${healthWarnings.length} issue(s) may need cleanup.`,
          href: `#health`,
          cta: "Review Warnings",
        }
      : null,
  ].filter(Boolean) as Array<{
    title: string;
    description: string;
    href: string;
    cta: string;
  }>;

  const activity = safeRows(activityData);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Content Command Center"
        title="Content calendar overview"
        description={`See where ${accountContext.activeAccountName ?? "the active workspace"} stands for the month, what needs attention, and where to go next.`}
        primaryAction={{ label: "Monthly Calendar", href: `/content-calendar/monthly?view=month&date=${monthDate}` }}
        secondaryAction={{ label: "Publish Center", href: `/publishing-schedule?view=week&date=${monthDate}` }}
      />

      <WebsiteSection
        eyebrow="Active Workspace"
        title={accountContext.activeAccountName ?? "Current workspace"}
        description="This overview is scoped to the active account workspace, so campaign counts, asset status, cleanup, and activity do not bleed across clients."
      >
        <article className={websiteStyles.card}>
          <div className="flex flex-wrap gap-2">
            <span className={websiteStyles.badge}>Workspace ID: {activeAccountId}</span>
            <span className={websiteStyles.badge}>Role: {accountContext.activeAccountRole ?? "member"}</span>
            {accountContext.isMaster ? <span className={websiteStyles.badge}>MASTER</span> : null}
          </div>
        </article>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Month"
        title={prettyMonth}
        description="This page is the dashboard for the content operation. Detailed work happens on the calendar, quality, approval, and publishing pages."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <ContentCommandCenterMonthSelector month={month} />
          </article>

          {metricCard({
            label: "Campaigns",
            value: campaigns.length,
            description: "Campaigns generated for this month.",
            href: `/content-calendar/monthly?view=month&date=${monthDate}`,
          })}

          {metricCard({
            label: "Active Assets",
            value: workingAssets.length,
            description: "Latest active, not published, not archived assets.",
            href: `/content-calendar/monthly?view=month&date=${monthDate}`,
          })}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Cleanup"
        title="Remove monthly content"
        description={`Use this when you want to clear ${accountContext.activeAccountName ?? "the active workspace"}'s generated package for the current month and start over.`}
      >
        <DeleteMonthlyCampaignButton month={month} />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Status"
        title="Current workflow status"
        description="A high-level snapshot of where the content sits in the production process."
      >
        <div className={websiteStyles.cardGrid}>
          {metricCard({
            label: "Need Quality",
            value: needsQuality.length,
            description: "Assets not yet scored or needing human quality follow-up.",
            href: `/content-quality?view=month&date=${monthDate}`,
          })}

          {metricCard({
            label: "Review Ready",
            value: reviewReady.length,
            description: "Assets that passed quality and are ready for approval.",
            href: `/approvals?view=month&date=${monthDate}`,
          })}

          {metricCard({
            label: "Approved",
            value: approvedAssets.length,
            description: "Approved assets that have not yet been published.",
            href: `/publishing-schedule?view=month&date=${monthDate}`,
          })}

          {metricCard({
            label: "Completed",
            value: publishedAssets.length,
            description: "Assets already sent, published, or completed.",
            href: `/actions?view=month&date=${monthDate}`,
          })}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Next"
        title="Recommended next actions"
        description="Use this section to move the month forward without hunting through every page."
      >
        {nextActions.length ? (
          <div className={websiteStyles.cardGrid}>
            {nextActions.map((action) => (
              <article key={action.title} className={websiteStyles.card}>
                <h3 className={websiteStyles.cardTitle}>{action.title}</h3>
                <p className={websiteStyles.cardText}>{action.description}</p>
                <div className={websiteStyles.actionRow}>
                  <Link href={action.href} className={websiteStyles.link}>
                    {action.cta} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No urgent next actions for this month. The workflow looks clean.
          </div>
        )}
      </WebsiteSection>

      <details className={websiteStyles.card}>
        <summary className={websiteStyles.cardTitle}>Content workspace links</summary>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link href={`/content-calendar/monthly?view=month&date=${monthDate}`} className={websiteStyles.link}>Monthly Calendar →</Link>
          <Link href={`/content-calendar/monthly-review?view=month&date=${monthDate}`} className={websiteStyles.link}>Monthly Review →</Link>
          <Link href={`/content-quality?view=week&date=${monthDate}`} className={websiteStyles.link}>Content Quality →</Link>
          <Link href={`/approvals?view=week&date=${monthDate}`} className={websiteStyles.link}>Approvals →</Link>
          <Link href={`/publishing-schedule?view=week&date=${monthDate}`} className={websiteStyles.link}>Publish Center →</Link>
          <Link href={`/actions?view=month&date=${monthDate}`} className={websiteStyles.link}>Action History →</Link>
        </div>
      </details>

      <WebsiteSection
        eyebrow="Health"
        title="Content health"
        description="Review duplicate, orphaned, or inconsistent content records that need attention."
      >
        <div id="health">
          {healthWarnings.length ? (
            <div className={websiteStyles.cardGrid}>
              {healthWarnings.map((warning) => (
                <article key={warning} className={websiteStyles.card}>
                  <h3 className={websiteStyles.cardTitle}>Needs attention</h3>
                  <p className={websiteStyles.cardText}>{warning}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className={websiteStyles.empty}>
              No content health warnings for {prettyMonth}.
            </div>
          )}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Activity Log"
        title="Recent content activity"
        description={`A chronological log of recent content system events for ${accountContext.activeAccountName ?? "the active workspace"}.`}
      >
        {activity.length ? (
          <div className={websiteStyles.logList}>
            {activity.map((item) => (
              <article key={item.id} className={websiteStyles.logItem}>
                <div className={websiteStyles.logRail}>
                  <span className={websiteStyles.logDot} aria-hidden="true" />
                  <span className={websiteStyles.logLine} aria-hidden="true" />
                </div>

                <div className={websiteStyles.logBody}>
                  <div className={websiteStyles.logHeader}>
                    <span className={websiteStyles.logTime}>
                      {dateLabel(item.created_at)}
                    </span>
                    <span className={[websiteStyles.badge, websiteStyles.badgeBlue].join(" ")}>
                      {activityTypeLabel(item.activity_type)}
                    </span>
                  </div>

                  <h3 className={websiteStyles.logTitle}>
                    {item.title ?? activityTypeLabel(item.activity_type)}
                  </h3>
                  <p className={websiteStyles.logText}>{activityDescription(item)}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No recent activity yet.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
