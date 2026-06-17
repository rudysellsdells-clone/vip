import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkingViewControls } from "@/components/calendar/WorkingViewControls";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import {
  applyPublishingScheduleQuery,
  filterPublishingScheduleAssets,
} from "@/lib/assets/asset-visibility";
import { buildCalendarViewRangeFromSearchParams } from "@/lib/calendar/view-range";
import { defaultViewForPage } from "@/lib/calendar/working-view-config";
import {
  filterPublishingAssetsByViewRange,
  groupPublishingAssetsByDay,
  publishingDateLabel,
} from "@/lib/calendar/publishing-schedule-view";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function safeRows(data: unknown) {
  return (Array.isArray(data) ? data : []) as Array<Record<string, any>>;
}

function assetTypeLabel(value: unknown) {
  return String(value ?? "asset").replaceAll("_", " ");
}

function hasPublishDate(asset: Record<string, any>) {
  return Boolean(asset.scheduled_publish_at ?? asset.planned_publish_date);
}

function preview(content: unknown, length = 180) {
  const text = String(content ?? "").replace(/\s+/g, " ").trim();

  if (!text) return "No content preview available.";

  return `${text.slice(0, length)}${text.length > length ? "..." : ""}`;
}

function formatDate(value: unknown) {
  if (!value) return "No date";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function assetPublishActionLabel(asset: Record<string, any>) {
  const text = [
    asset.asset_type,
    asset.channel,
    asset.destination,
    asset.platform,
    asset.title,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");

  if (text.includes("wordpress") || text.includes("blog") || text.includes("article")) {
    return "Publish blog post →";
  }

  if (text.includes("email") || text.includes("gmail")) return "Create email draft →";
  if (text.includes("facebook")) return "Publish to Facebook →";
  if (text.includes("linkedin")) return "Publish to LinkedIn →";

  return "Publish / send →";
}

function canExecuteLegacyRun(run: Record<string, unknown>) {
  return (
    run.provider === "zapier_mcp" &&
    typeof run.status === "string" &&
    ["planned", "waiting_approval", "failed"].includes(run.status)
  );
}

function isPublishingRelatedToolRun(run: Record<string, unknown>) {
  const text = [
    run.action_name,
    run.action_key,
    run.provider,
    run.destination,
    run.channel,
    run.app,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");

  return (
    text.includes("wordpress") ||
    text.includes("blog") ||
    text.includes("post") ||
    text.includes("linkedin") ||
    text.includes("facebook") ||
    text.includes("gmail") ||
    text.includes("email") ||
    text.includes("zapier")
  );
}

function legacyActionTitle(run: Record<string, unknown>) {
  return String(run.action_name || run.destination || run.channel || "Publishing action");
}

export default async function PublishingSchedulePage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const range = buildCalendarViewRangeFromSearchParams({
    searchParams: resolvedSearchParams,
    defaultView: defaultViewForPage("publishing-schedule"),
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

  const [assetsResult, toolRunsResult] = await Promise.all([
    applyPublishingScheduleQuery(
      supabase
        .from("generated_assets")
        .select("*")
        .eq("account_id", activeAccountId)
        .order("scheduled_publish_at", { ascending: true, nullsFirst: false })
        .limit(1000),
    ),
    supabase
      .from("tool_runs")
      .select("*")
      .eq("account_id", activeAccountId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const allApprovedActiveAssets = filterPublishingScheduleAssets(safeRows(assetsResult.data));
  const visibleAssets = filterPublishingAssetsByViewRange(allApprovedActiveAssets, range, {
    includeUnscheduled: true,
  });
  const groups = groupPublishingAssetsByDay(visibleAssets);
  const unscheduledCount = allApprovedActiveAssets.filter((asset) => !hasPublishDate(asset)).length;
  const legacyPublishingActions = safeRows(toolRunsResult.data)
    .filter(canExecuteLegacyRun)
    .filter(isPublishingRelatedToolRun)
    .slice(0, 12);
  const readyNowCount = unscheduledCount + legacyPublishingActions.length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publish Center"
        title="Publish approved content"
        description={`This queue is scoped to the active workspace: ${accountContext.activeAccountName ?? "Current workspace"}. Review payloads before any live publishing execution.`}
        primaryAction={{ label: "Action History", href: "/actions" }}
        secondaryAction={{ label: "Review Content", href: "/approvals" }}
      />

      <WebsiteSection
        eyebrow="Active Workspace"
        title={accountContext.activeAccountName ?? "Current workspace"}
        description="H1.4D3A scopes Publish Center by workspace so you can review the destination and payload before anything leaves VIP."
      >
        <article className={websiteStyles.card}>
          <div className="flex flex-wrap gap-2">
            <span className={websiteStyles.badge}>Workspace ID: {activeAccountId}</span>
            <span className={websiteStyles.badge}>Role: {accountContext.activeAccountRole ?? "member"}</span>
            {accountContext.isMaster ? <span className={websiteStyles.badge}>MASTER preview</span> : null}
          </div>
        </article>
      </WebsiteSection>

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Approved Assets"
          value={allApprovedActiveAssets.length}
          description="Canonical assets eligible for the publish queue."
          dot="blue"
        />
        <WebsiteMetric
          label="Ready Now"
          value={readyNowCount}
          description="Approved items with no publish date plus runnable legacy publish actions."
          dot={readyNowCount ? "green" : "blue"}
        />
        <WebsiteMetric
          label="In Current View"
          value={visibleAssets.length}
          description="Assets visible in the selected calendar view."
          dot="gold"
        />
        <WebsiteMetric
          label="Legacy Actions"
          value={legacyPublishingActions.length}
          description="Older publish actions still ready to run from the Publish Center."
          dot={legacyPublishingActions.length ? "gold" : "blue"}
        />
      </section>

      <WebsiteSection
        eyebrow="Queue View"
        title={range.label}
        description="Switch between daily, weekly, and monthly queue views. Unscheduled approved content stays visible in the Ready Now group."
      >
        <WorkingViewControls
          basePath="/publishing-schedule"
          range={range}
          visibleCount={visibleAssets.length}
          totalCount={allApprovedActiveAssets.length}
          title="Publish Center view"
          visibleLabel="In View"
          totalLabel="Approved Queue"
        />
      </WebsiteSection>

      {readyNowCount ? (
        <WebsiteSection
          eyebrow="Ready Now"
          title={`${readyNowCount} item(s) ready for a publishing action`}
          description="These items can be acted on now. Canonical assets open an asset-specific publishing step. Legacy publishing actions can be executed directly here while we finish consolidating old workflows."
        >
          <div className={websiteStyles.cardGrid}>
            {unscheduledCount ? (
              <article className={websiteStyles.card}>
                <h3 className={websiteStyles.cardTitle}>Approved assets without a publish date</h3>
                <p className={websiteStyles.cardText}>
                  These are approved assets that are not scheduled yet. They remain visible in the queue and can be published manually.
                </p>
                <p className={websiteStyles.cardMeta}>{unscheduledCount} canonical item(s)</p>
              </article>
            ) : null}

            {legacyPublishingActions.length ? (
              <article className={websiteStyles.card}>
                <h3 className={websiteStyles.cardTitle}>Legacy publishing actions</h3>
                <p className={websiteStyles.cardText}>
                  Some older flows still create executable publishing actions. H1.4D3A shows them for review only so no external provider is triggered during preflight testing.
                </p>
                <p className={websiteStyles.cardMeta}>{legacyPublishingActions.length} action(s) ready</p>
              </article>
            ) : null}
          </div>
        </WebsiteSection>
      ) : null}

      <WebsiteSection
        eyebrow="Canonical Queue"
        title={`${range.view === "day" ? "Daily" : range.view === "month" ? "Monthly" : "Weekly"} publish queue`}
        description="Approved canonical assets appear here until they are sent to their publishing destination and marked published."
      >
        {assetsResult.error ? (
          <div className={websiteStyles.empty}>{assetsResult.error.message}</div>
        ) : groups.length ? (
          <div className="grid gap-5">
            {groups.map((group) => (
              <section key={group.key} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className={websiteStyles.cardTitle}>{group.label}</h3>
                  <span className={websiteStyles.badge}>{group.assets.length} item(s)</span>
                </div>

                {group.isUnscheduled ? (
                  <p className={websiteStyles.cardMeta} style={{ marginTop: 8 }}>
                    These approved assets have no publish date. They are eligible for manual publishing.
                  </p>
                ) : null}

                <div className={websiteStyles.cardGrid} style={{ marginTop: 16 }}>
                  {group.assets.map((asset) => (
                    <article key={asset.id} className={websiteStyles.card}>
                      <div className="flex flex-wrap gap-2">
                        <WebsiteBadge status={asset.status ?? "approved"} />
                        <span className={websiteStyles.badge}>{assetTypeLabel(asset.asset_type)}</span>
                        <span className={websiteStyles.badge}>{publishingDateLabel(asset)}</span>
                        {!hasPublishDate(asset) ? (
                          <span className={websiteStyles.badge}>Manual publish</span>
                        ) : null}
                      </div>

                      <h4 className={websiteStyles.cardTitle} style={{ marginTop: 14, fontSize: 16 }}>
                        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                          {asset.title}
                        </Link>
                      </h4>

                      <p className={websiteStyles.cardText}>{preview(asset.content)}</p>

                      <div className={websiteStyles.actionRow}>
                        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                          Open →
                        </Link>
                        <Link href={`/publishing-ready?asset=${asset.id}`} className={websiteStyles.link}>
                          {assetPublishActionLabel(asset)}
                        </Link>
                        {!hasPublishDate(asset) ? (
                          <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                            Add date →
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No approved active assets are visible in this {range.view} view. If you just approved content and do not see it here, check Review Content for approval status or Action History for older legacy publishing actions.
            <div className={websiteStyles.actionRow} style={{ justifyContent: "center", marginTop: 14 }}>
              <Link href="/approvals" className={websiteStyles.link}>
                Review Content →
              </Link>
              <Link href="/actions" className={websiteStyles.link}>
                Action History →
              </Link>
            </div>
          </div>
        )}
      </WebsiteSection>

      {legacyPublishingActions.length ? (
        <WebsiteSection
          eyebrow="Legacy Publish Actions"
          title="Publish actions ready to run"
          description="These are older ZapierMCP tool-run actions. H1.4D3A shows them for review only while the live execution guard is completed in H1.4D3B."
        >
          <div className={websiteStyles.cardGrid}>
            {legacyPublishingActions.map((run) => (
              <article key={String(run.id)} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>{legacyActionTitle(run)}</h3>
                  <WebsiteBadge status={String(run.status)} />
                </div>

                <p className={websiteStyles.cardMeta}>
                  {String(run.provider ?? "zapier_mcp")} • Created {formatDate(run.created_at)}
                </p>

                {run.error ? (
                  <p className={websiteStyles.cardText}>
                    <strong>Error:</strong> {String(run.error)}
                  </p>
                ) : null}

                <div className={websiteStyles.actionRow}>
                  <span className={websiteStyles.badge}>Preflight review only</span>
                  <Link href="/actions" className={websiteStyles.link}>
                    View history →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </WebsiteSection>
      ) : null}
    </WebsitePage>
  );
}