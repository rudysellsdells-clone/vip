import Link from "next/link";
import { redirect } from "next/navigation";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import {
  activeOnly,
  exportTypeIs,
  formatNumber,
  itemStatusIs,
  runStatusIs,
  safeCount,
  safeSelect,
  statusIs,
  statusPercent,
  typeIn,
  typeIs,
} from "@/lib/reports/safe-reporting";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

const AUTHORITY_TYPES = ["blog_post", "white_paper", "authority_asset"];
const REPURPOSED_TYPES = ["linkedin_post", "facebook_post", "email", "video_script"];
const PHASE_TWO_TYPES = [
  "blog_post",
  "white_paper",
  "authority_asset",
  "prospect_what_if_story",
  "linkedin_post",
  "facebook_post",
  "email",
  "video_script",
];

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function typeLabel(value: string | null | undefined) {
  return String(value ?? "item").replaceAll("_", " ");
}

function errorText(errors: Array<string | null>) {
  const activeErrors = errors.filter(Boolean);

  if (!activeErrors.length) {
    return null;
  }

  return activeErrors.slice(0, 4).join(" • ");
}

export default async function PhaseTwoReportingPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    calendarPlans,
    calendarItems,
    calendarGeneratedItems,
    calendarPublishedItems,
    authorityAssets,
    whatIfStories,
    repurposedAssets,
    assetsNeedsReview,
    assetsApproved,
    pdfExports,
    gmailDraftExports,
    gmailDraftCompleted,
    publishingRuns,
    publishingCompleted,
    publishingFailed,
    backlinkOpportunities,
    acquiredBacklinks,
  ] = await Promise.all([
    safeCount(supabase, { table: "content_calendar_plans", userId: user.id }),
    safeCount(supabase, { table: "content_calendar_items", userId: user.id }),
    safeCount(supabase, {
      table: "content_calendar_items",
      userId: user.id,
      filters: [itemStatusIs("generated")],
    }),
    safeCount(supabase, {
      table: "content_calendar_items",
      userId: user.id,
      filters: [itemStatusIs("published")],
    }),
    safeCount(supabase, {
      table: "generated_assets",
      userId: user.id,
      filters: [activeOnly, typeIn(AUTHORITY_TYPES)],
    }),
    safeCount(supabase, {
      table: "generated_assets",
      userId: user.id,
      filters: [activeOnly, typeIs("prospect_what_if_story")],
    }),
    safeCount(supabase, {
      table: "generated_assets",
      userId: user.id,
      filters: [activeOnly, typeIn(REPURPOSED_TYPES)],
    }),
    safeCount(supabase, {
      table: "generated_assets",
      userId: user.id,
      filters: [activeOnly, statusIs("needs_review")],
    }),
    safeCount(supabase, {
      table: "generated_assets",
      userId: user.id,
      filters: [activeOnly, statusIs("approved")],
    }),
    safeCount(supabase, {
      table: "asset_exports",
      userId: user.id,
      filters: [exportTypeIs("what_if_pdf")],
    }),
    safeCount(supabase, {
      table: "asset_exports",
      userId: user.id,
      filters: [exportTypeIs("gmail_draft_with_pdf")],
    }),
    safeCount(supabase, {
      table: "asset_exports",
      userId: user.id,
      filters: [exportTypeIs("gmail_draft_with_pdf"), statusIs("completed")],
    }),
    safeCount(supabase, {
      table: "publishing_execution_runs",
      userId: user.id,
    }),
    safeCount(supabase, {
      table: "publishing_execution_runs",
      userId: user.id,
      filters: [runStatusIs("completed")],
    }),
    safeCount(supabase, {
      table: "publishing_execution_runs",
      userId: user.id,
      filters: [runStatusIs("failed")],
    }),
    safeCount(supabase, {
      table: "backlink_opportunities",
      userId: user.id,
    }),
    safeCount(supabase, {
      table: "acquired_backlinks",
      userId: user.id,
    }),
  ]);

  const [recentAssetsResult, recentRunsResult, recentExportsResult] = await Promise.all([
    safeSelect(supabase, {
      table: "generated_assets",
      userId: user.id,
      filters: [activeOnly, typeIn(PHASE_TWO_TYPES)],
      orderBy: "created_at",
      ascending: false,
      limit: 10,
    }),
    safeSelect(supabase, {
      table: "publishing_execution_runs",
      userId: user.id,
      orderBy: "created_at",
      ascending: false,
      limit: 8,
    }),
    safeSelect(supabase, {
      table: "asset_exports",
      userId: user.id,
      filters: [(query) => query.in("export_type", ["what_if_pdf", "gmail_draft_with_pdf"])],
      orderBy: "created_at",
      ascending: false,
      limit: 8,
    }),
  ]);

  const recentAssets = recentAssetsResult.data as Array<Record<string, any>>;
  const recentRuns = recentRunsResult.data as Array<Record<string, any>>;
  const recentExports = recentExportsResult.data as Array<Record<string, any>>;

  const totalPhaseTwoAssets =
    authorityAssets.value + whatIfStories.value + repurposedAssets.value;

  const totalContentOutputs =
    totalPhaseTwoAssets + pdfExports.value + gmailDraftExports.value;

  const reportingWarning = errorText([
    backlinkOpportunities.error,
    acquiredBacklinks.error,
    recentRunsResult.error,
    recentExportsResult.error,
  ]);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Phase Two Reporting"
        title="Proof of work for VIP’s content engine."
        description="Track what VIP has planned, generated, repurposed, packaged, drafted, executed, and archived out of the working flow."
        primaryAction={{ label: "Phase Two Hub", href: "/phase-two" }}
        secondaryAction={{ label: "Publishing Ready", href: "/publishing-ready" }}
      />

      {reportingWarning ? (
        <div className={websiteStyles.empty}>
          Some optional reporting sources were unavailable: {reportingWarning}
        </div>
      ) : null}

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Total Content Outputs"
          value={formatNumber(totalContentOutputs)}
          description="Assets, PDFs, and Gmail draft records."
          dot="blue"
        />
        <WebsiteMetric
          label="Authority Assets"
          value={formatNumber(authorityAssets.value)}
          description="Active blogs, white papers, and authority guides."
          dot="gold"
        />
        <WebsiteMetric
          label="Repurposed Assets"
          value={formatNumber(repurposedAssets.value)}
          description="Active LinkedIn, Facebook, email, and video outputs."
          dot="purple"
        />
        <WebsiteMetric
          label="Completed Runs"
          value={formatNumber(publishingCompleted.value)}
          description="Publishing readiness executions completed."
          dot="green"
        />
      </section>

      <WebsiteSection
        eyebrow="Planning"
        title="Strategic calendar production"
        description="How much planning work has moved from calendar items toward generated or published output."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Monthly plans</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(calendarPlans.value)} strategic content calendar plan(s) created.
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Calendar items</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(calendarItems.value)} planned item(s), with{" "}
              {formatNumber(calendarGeneratedItems.value)} generated.
            </p>
            <p className={websiteStyles.cardMeta}>
              Generation rate: {statusPercent(calendarGeneratedItems.value, calendarItems.value)}
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Published calendar items</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(calendarPublishedItems.value)} calendar item(s) marked published.
            </p>
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Content"
        title="Generated content proof"
        description="Active generated assets across authority, prospecting, and repurposing workflows."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Authority content</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(authorityAssets.value)} active authority asset(s) created.
            </p>
            <Link href="/authority-content" className={websiteStyles.link}>
              Open Authority Content →
            </Link>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>What-If Stories</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(whatIfStories.value)} active What-If Success Story asset(s).
            </p>
            <Link href="/what-if-stories" className={websiteStyles.link}>
              Open What-If Stories →
            </Link>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Review queue</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(assetsNeedsReview.value)} active asset(s) need review.{" "}
              {formatNumber(assetsApproved.value)} active asset(s) are approved.
            </p>
            <Link href="/approvals" className={websiteStyles.link}>
              Open Approvals →
            </Link>
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Packaging + Outreach"
        title="PDFs, Gmail drafts, and publishing runs"
        description="Track how much content has moved beyond generation into outreach or execution readiness."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Branded PDFs</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(pdfExports.value)} What-If PDF export(s) created.
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Gmail drafts</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(gmailDraftExports.value)} Gmail draft prep/export record(s),{" "}
              {formatNumber(gmailDraftCompleted.value)} completed.
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Publishing runs</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(publishingRuns.value)} run(s),{" "}
              {formatNumber(publishingCompleted.value)} completed and{" "}
              {formatNumber(publishingFailed.value)} failed.
            </p>
            <Link href="/publishing-ready" className={websiteStyles.link}>
              Open Publishing Ready →
            </Link>
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Link Building"
        title="Authority and backlink progress"
        description="Optional link builder proof points. If the link builder tables are not available, this section will simply show zero or a warning."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Backlink opportunities</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(backlinkOpportunities.value)} backlink opportunity record(s).
            </p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Acquired backlinks</h3>
            <p className={websiteStyles.cardText}>
              {formatNumber(acquiredBacklinks.value)} acquired backlink record(s).
            </p>
            <Link href="/link-builder" className={websiteStyles.link}>
              Open Link Builder →
            </Link>
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Recent"
        title="Recent active Phase Two assets"
        description="Latest active assets generated by authority, What-If, and repurposing workflows."
      >
        {recentAssets.length ? (
          <div className={websiteStyles.cardGrid}>
            {recentAssets.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={asset.status ?? "needs_review"} />
                  <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    {asset.title}
                  </Link>
                </h3>

                <p className={websiteStyles.cardMeta}>
                  Created {formatDate(asset.created_at)}
                </p>

                <p className={websiteStyles.cardText}>
                  {String(asset.content ?? "").slice(0, 220)}...
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No active Phase Two assets found yet.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Execution History"
        title="Recent publishing runs"
        description="Recent records from the Publishing Ready execution ledger."
      >
        {recentRuns.length ? (
          <div className={websiteStyles.cardGrid}>
            {recentRuns.map((run) => (
              <article key={run.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={run.status ?? "prepared"} />
                  <span className={websiteStyles.badge}>{run.channel}</span>
                  <span className={websiteStyles.badge}>{run.provider}</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  {run.destination ?? run.channel}
                </h3>

                <p className={websiteStyles.cardMeta}>
                  {formatDate(run.created_at)}
                </p>

                {run.error ? (
                  <p className={websiteStyles.cardText}>
                    <strong>Error:</strong> {run.error}
                  </p>
                ) : null}

                {run.asset_id ? (
                  <Link href={`/assets/${run.asset_id}`} className={websiteStyles.link}>
                    Open asset →
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No publishing runs yet.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Exports"
        title="Recent PDF and Gmail records"
        description="Recent What-If PDF and Gmail draft export records."
      >
        {recentExports.length ? (
          <div className={websiteStyles.cardGrid}>
            {recentExports.map((record) => (
              <article key={record.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={record.status ?? "created"} />
                  <span className={websiteStyles.badge}>{typeLabel(record.export_type)}</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  {record.subject ?? record.file_name ?? record.export_type}
                </h3>

                <p className={websiteStyles.cardMeta}>
                  {formatDate(record.created_at)}
                </p>

                <div className={websiteStyles.actionRow}>
                  {record.file_url ? (
                    <Link href={record.file_url} className={websiteStyles.link} target="_blank">
                      Open file →
                    </Link>
                  ) : null}
                  {record.asset_id ? (
                    <Link href={`/assets/${record.asset_id}`} className={websiteStyles.link}>
                      Open asset →
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No PDF or Gmail export records yet.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
