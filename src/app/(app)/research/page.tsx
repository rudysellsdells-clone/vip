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
  const workspace = await getMarketIntelligenceWorkspace({
    supabase,
    accountId,
  });

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow={`Market Intelligence • ${accountName}`}
        title="Research the market before the campaign."
        description="Build cited, dated, geography-aware intelligence for competitors, search demand, audience behavior, trends, risks, and market opportunities. Draft research stays private until an account owner or admin approves it."
        primaryAction={{ label: "Strategy Workspace", href: "/strategy" }}
        secondaryAction={{ label: "Create Campaign", href: "/campaigns" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Active Projects"
          value={workspace.counts.activeProjects}
          description="Research scopes currently in progress."
          dot={workspace.counts.activeProjects ? "blue" : "gold"}
        />
        <WebsiteMetric
          label="Cited Sources"
          value={workspace.counts.sources}
          description="Active evidence records attached to this workspace."
          dot={workspace.counts.sources ? "green" : "gold"}
        />
        <WebsiteMetric
          label="Draft Findings"
          value={workspace.counts.draftFindings}
          description="Insights awaiting account review."
          dot={workspace.counts.draftFindings ? "gold" : "blue"}
        />
        <WebsiteMetric
          label="Approved Findings"
          value={workspace.counts.approvedFindings}
          description="Intelligence eligible for Strategy and campaign planning."
          dot={workspace.counts.approvedFindings ? "green" : "gold"}
        />
        <WebsiteMetric
          label="Rejected Findings"
          value={workspace.counts.rejectedFindings}
          description="Research intentionally excluded from approved intelligence."
          dot={workspace.counts.rejectedFindings ? "red" : "blue"}
        />
      </section>

      <WebsiteSection
        eyebrow="Research Controls"
        title="Projects, sources, findings, and approval"
        description="Keep research evidence separate from account-owned business truth. Market intelligence may inform Strategy only after explicit approval."
      >
        <MarketIntelligenceWorkspace
          projects={workspace.projects}
          sources={workspace.sources}
          findings={workspace.findings}
          canManage={canManage}
        />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Research Register"
        title="Current projects and cited evidence"
        description="Review the active scopes and source records supporting this workspace's findings."
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
        title="What is currently eligible for downstream use"
        description="These findings passed account review. Campaign integration consumes this approved set rather than raw research notes."
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
              No approved findings yet. Draft research remains isolated until it is reviewed.
            </div>
          )}
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
