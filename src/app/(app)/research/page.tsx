import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteFailedResearchRunButton } from "@/components/market-intelligence/DeleteFailedResearchRunButton";
import { MarketIntelligenceWorkspace } from "@/components/market-intelligence/MarketIntelligenceWorkspace";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getMarketIntelligenceWorkspace } from "@/lib/market-intelligence/get-market-intelligence-workspace";
import { isMarketIntelligenceEnabled } from "@/lib/market-intelligence/feature";
import { buildMarketIntelligenceWorkspace } from "@/lib/market-intelligence/market-intelligence";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

function formatDate(value: string | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function MarketIntelligencePage() {
  if (!isMarketIntelligenceEnabled()) notFound();

  const { supabase, accountId, accountName, canManage } =
    await requireStrategyWorkspace();
  const foundation = await getApprovedStrategyFoundation({ supabase, accountId });
  const defaultGeography = foundation.businessTruth.serviceAreas.join(", ");
  let setupError: string | null = null;
  let workspace = {
    ...buildMarketIntelligenceWorkspace({
      projects: [],
      sources: [],
      findings: [],
    }),
    automatedReports: [],
    failedProjectIds: [],
  } as Awaited<ReturnType<typeof getMarketIntelligenceWorkspace>>;

  try {
    workspace = await getMarketIntelligenceWorkspace({
      supabase,
      accountId,
    });
  } catch (error) {
    setupError =
      error instanceof Error
        ? error.message
        : "Market Intelligence storage is not available yet.";
  }

  const reportByProjectId = new Map(
    workspace.automatedReports.map((item) => [item.projectId, item]),
  );
  const failedProjectIdSet = new Set(workspace.failedProjectIds);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow={`Market Intelligence • ${accountName}`}
        title="See the competitive landscape, market position, and best openings."
        description="VIP researches the live web, discovers competitors, compares positioning and offers, identifies search and content opportunities, and recommends realistic gaps the active account can fill."
        primaryAction={{ label: "Strategy Workspace", href: "/strategy" }}
        secondaryAction={{ label: "Create Campaign", href: "/campaigns" }}
      />

      {setupError ? (
        <div className="border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-sm">
          <p className="font-black">Research preview is enabled.</p>
          <p className="mt-1">
            The Market Intelligence interface is visible, but its database migration has not been applied to this environment yet. Research records cannot be saved until the three Market Intelligence tables are available.
          </p>
          <p className="mt-2 text-xs font-semibold text-amber-800">
            Database response: {setupError}
          </p>
        </div>
      ) : null}

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Completed Reports"
          value={workspace.automatedReports.length}
          description="Saved automated market-position studies."
          dot={workspace.automatedReports.length ? "green" : "gold"}
        />
        <WebsiteMetric
          label="Research Projects"
          value={workspace.projects.length}
          description="Completed, active, draft, and failed scan records."
          dot={workspace.projects.length ? "blue" : "gold"}
        />
        <WebsiteMetric
          label="Cited Sources"
          value={workspace.counts.sources}
          description="Web evidence captured by scans and reviewers."
          dot={workspace.counts.sources ? "green" : "gold"}
        />
        <WebsiteMetric
          label="Draft Findings"
          value={workspace.counts.draftFindings}
          description="Automated insights awaiting account review."
          dot={workspace.counts.draftFindings ? "gold" : "blue"}
        />
        <WebsiteMetric
          label="Approved Findings"
          value={workspace.counts.approvedFindings}
          description="Intelligence eligible for Strategy and campaigns."
          dot={workspace.counts.approvedFindings ? "green" : "gold"}
        />
      </section>

      <WebsiteSection
        eyebrow="Automated Market Scan"
        title="Research, compare, and report"
        description="The scan uses the active account's Strategy Foundation as its baseline. It discovers competitors and market openings automatically, then saves the evidence and findings for review."
      >
        <MarketIntelligenceWorkspace
          projects={workspace.projects}
          sources={workspace.sources}
          findings={workspace.findings}
          canManage={canManage && !setupError}
          accountName={accountName}
          defaultGeography={defaultGeography}
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Market Position Reports"
        title="Saved reports and scan attempts"
        description="Every scan has a permanent detail page. Completed scans open the full report; failed attempts can be reviewed or removed."
      >
        <div className={websiteStyles.cardGrid}>
          {workspace.projects.length ? (
            workspace.projects.map((project) => {
              const savedReport = reportByProjectId.get(project.id);
              const isFailed = failedProjectIdSet.has(project.id);
              return (
                <article key={project.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={websiteStyles.sectionEyebrow}>
                        {savedReport
                          ? "Completed Web Report"
                          : isFailed
                            ? "Failed Research Run"
                            : "Research Scan Record"}
                      </p>
                      <h3 className={websiteStyles.cardTitle}>
                        {savedReport?.report.reportTitle || project.title}
                      </h3>
                    </div>
                    <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black uppercase tracking-[0.1em] text-slate-600">
                      {isFailed ? "failed" : project.status}
                    </span>
                  </div>

                  <p className={websiteStyles.cardText}>
                    {savedReport?.report.executiveSummary ||
                      project.objective ||
                      "Open this scan record to review its status and saved evidence."}
                  </p>

                  <p className={websiteStyles.cardMeta}>
                    {[
                      project.geography,
                      savedReport
                        ? `${savedReport.report.competitors.length} competitors • ${savedReport.report.gaps.length} gaps`
                        : null,
                      `Updated ${formatDate(project.updatedAt)}`,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>

                  <div className="mt-4 flex flex-wrap items-start gap-3">
                    <Link
                      href={`/research/${project.id}`}
                      className="inline-flex items-center bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      {savedReport ? "View Full Report" : "View Scan Details"} →
                    </Link>
                    {canManage && isFailed ? (
                      <DeleteFailedResearchRunButton projectId={project.id} />
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className={websiteStyles.empty}>
              No scan attempts yet. Run the first market scan above to discover competitors, market position, and likely fillable gaps.
            </div>
          )}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Evidence Register"
        title="Recently cited sources"
        description="Open the associated scan detail page for the full source and finding register."
      >
        <div className={websiteStyles.cardGrid}>
          {workspace.sources.length ? (
            workspace.sources.slice(0, 8).map((source) => (
              <article key={source.id} className={websiteStyles.card}>
                <p className={websiteStyles.sectionEyebrow}>
                  {source.sourceType.replaceAll("_", " ")}
                </p>
                <h3 className={websiteStyles.cardTitle}>{source.title}</h3>
                <p className={websiteStyles.cardText}>
                  {source.summary || "No source summary recorded."}
                </p>
                <p className={websiteStyles.cardMeta}>
                  {[source.publisher, `Retrieved ${formatDate(source.retrievedAt)}`]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
                {source.sourceUrl ? (
                  <a
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={websiteStyles.link}
                  >
                    Open source →
                  </a>
                ) : null}
              </article>
            ))
          ) : (
            <div className={websiteStyles.empty}>No cited sources yet.</div>
          )}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Approved Intelligence"
        title="What is eligible for Strategy and campaigns"
        description="These findings passed account review. Draft and rejected intelligence remains excluded from downstream use."
      >
        <div className={websiteStyles.cardGrid}>
          {workspace.approvedFindings.length ? (
            workspace.approvedFindings.map((finding) => (
              <article key={finding.id} className={websiteStyles.card}>
                <p className={websiteStyles.sectionEyebrow}>
                  {finding.findingType.replaceAll("_", " ")}
                </p>
                <h3 className={websiteStyles.cardTitle}>{finding.title}</h3>
                <p className={websiteStyles.cardText}>{finding.summary}</p>
                <p className={websiteStyles.cardMeta}>
                  {finding.sourceIds.length} cited source
                  {finding.sourceIds.length === 1 ? "" : "s"}
                  {finding.confidenceScore !== null
                    ? ` • ${finding.confidenceScore}% confidence`
                    : ""}
                  {finding.geography ? ` • ${finding.geography}` : ""}
                </p>
              </article>
            ))
          ) : (
            <div className={websiteStyles.empty}>
              No approved findings yet. Review the draft findings created by a completed automated scan.
            </div>
          )}
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
