import { notFound } from "next/navigation";
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

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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
        <WebsiteMetric
          label="Rejected Findings"
          value={workspace.counts.rejectedFindings}
          description="Research intentionally excluded downstream."
          dot={workspace.counts.rejectedFindings ? "red" : "blue"}
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
        title="What the web research found"
        description="Each report compares the active account to observed competitors and turns the evidence into realistic positioning and growth recommendations."
      >
        <div className="space-y-6">
          {workspace.automatedReports.length ? (
            workspace.automatedReports.map(({ projectId, projectTitle, completedAt, report }) => (
              <article key={projectId} className="border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className={websiteStyles.sectionEyebrow}>Automated Web Report</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">
                      {report.reportTitle || projectTitle}
                    </h3>
                    <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-700">
                      {report.executiveSummary}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-slate-500">
                    Completed {formatDate(completedAt)}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <WebsiteMetric label="Competitors" value={report.competitors.length} description="Direct competitors reviewed." dot="blue" />
                  <WebsiteMetric label="Fillable Gaps" value={report.gaps.length} description="Practical openings identified." dot="green" />
                  <WebsiteMetric label="Search Topics" value={report.searchDemand.length} description="Demand and intent opportunities." dot="gold" />
                  <WebsiteMetric label="Sources" value={report.sources.length} description="Web sources supporting the report." dot="blue" />
                </div>

                <div className="mt-6 border-l-4 border-blue-500 bg-blue-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                    Current Market Position
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-800">{report.marketPosition}</p>
                </div>

                <div className="mt-7">
                  <p className={websiteStyles.sectionEyebrow}>Competitive Landscape</p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {report.competitors.map((competitor) => (
                      <article key={`${projectId}-${competitor.name}`} className={websiteStyles.card}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h4 className={websiteStyles.cardTitle}>{competitor.name}</h4>
                          {competitor.websiteUrl ? (
                            <a href={competitor.websiteUrl} target="_blank" rel="noreferrer" className={websiteStyles.link}>
                              Visit website →
                            </a>
                          ) : null}
                        </div>
                        <p className={websiteStyles.cardText}>{competitor.positioning}</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Strengths</p>
                            <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                              {competitor.strengths.map((item) => <li key={item}>• {item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">Openings</p>
                            <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                              {competitor.weaknesses.map((item) => <li key={item}>• {item}</li>)}
                            </ul>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="mt-7">
                  <p className={websiteStyles.sectionEyebrow}>Likely Fillable Gaps</p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {report.gaps.map((gap) => (
                      <article key={`${projectId}-${gap.title}`} className={websiteStyles.card}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className={websiteStyles.sectionEyebrow}>{label(gap.category)}</p>
                            <h4 className={websiteStyles.cardTitle}>{gap.title}</h4>
                          </div>
                          <span className="text-xs font-black text-slate-500">{gap.confidenceScore}% confidence</span>
                        </div>
                        <p className={websiteStyles.cardText}>{gap.description}</p>
                        <p className="mt-3 text-xs leading-5 text-slate-600">
                          <strong>Why it is fillable:</strong> {gap.whyFillable}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-700">
                          <strong>Recommended action:</strong> {gap.recommendedAction}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                {report.searchDemand.length || report.risks.length ? (
                  <div className="mt-7 grid gap-5 lg:grid-cols-2">
                    <div>
                      <p className={websiteStyles.sectionEyebrow}>Search and Demand Openings</p>
                      <div className="mt-4 space-y-3">
                        {report.searchDemand.map((item) => (
                          <article key={`${projectId}-${item.topic}`} className={websiteStyles.card}>
                            <h4 className={websiteStyles.cardTitle}>{item.topic}</h4>
                            <p className={websiteStyles.cardText}>{item.opportunity}</p>
                            <p className={websiteStyles.cardMeta}>{item.intent} • {item.confidenceScore}% confidence</p>
                          </article>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className={websiteStyles.sectionEyebrow}>Risks and Watchouts</p>
                      <div className="mt-4 space-y-3">
                        {report.risks.map((risk) => (
                          <article key={`${projectId}-${risk.title}`} className={websiteStyles.card}>
                            <h4 className={websiteStyles.cardTitle}>{risk.title}</h4>
                            <p className={websiteStyles.cardText}>{risk.description}</p>
                            <p className="mt-3 text-xs leading-5 text-slate-600"><strong>Mitigation:</strong> {risk.mitigation}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className={websiteStyles.empty}>
              No automated report yet. Run the first market scan above to discover competitors, market position, and likely fillable gaps.
            </div>
          )}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Research Register"
        title="Projects and cited evidence"
        description="Review the research projects and source records supporting the reports and findings."
      >
        <div className={websiteStyles.twoColumn}>
          <div>
            <p className={websiteStyles.sectionEyebrow}>Research Projects</p>
            <div className="mt-4 space-y-3">
              {workspace.projects.length ? (
                workspace.projects.map((project) => (
                  <article key={project.id} className={websiteStyles.card}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className={websiteStyles.cardTitle}>{project.title}</h3>
                      <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black uppercase tracking-[0.1em] text-slate-600">
                        {project.status}
                      </span>
                    </div>
                    <p className={websiteStyles.cardText}>
                      {project.objective || "No research objective recorded."}
                    </p>
                    <p className={websiteStyles.cardMeta}>
                      {[project.industry, project.geography, `Updated ${formatDate(project.updatedAt)}`]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </article>
                ))
              ) : (
                <div className={websiteStyles.empty}>No research projects yet.</div>
              )}
            </div>
          </div>

          <div>
            <p className={websiteStyles.sectionEyebrow}>Cited Sources</p>
            <div className="mt-4 space-y-3">
              {workspace.sources.length ? (
                workspace.sources.map((source) => (
                  <article key={source.id} className={websiteStyles.card}>
                    <p className={websiteStyles.sectionEyebrow}>
                      {source.sourceType.replaceAll("_", " ")}
                    </p>
                    <h3 className={websiteStyles.cardTitle}>{source.title}</h3>
                    <p className={websiteStyles.cardText}>
                      {source.summary || "No source summary recorded."}
                    </p>
                    <p className={websiteStyles.cardMeta}>
                      {[source.publisher, source.author, `Retrieved ${formatDate(source.retrievedAt)}`]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                    {source.sourceUrl ? (
                      <div className="mt-4">
                        <a
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={websiteStyles.link}
                        >
                          Open source →
                        </a>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className={websiteStyles.empty}>No cited sources yet.</div>
              )}
            </div>
          </div>
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
              No approved findings yet. Review the draft findings created by an automated scan.
            </div>
          )}
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
