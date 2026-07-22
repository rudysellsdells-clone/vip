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
        eyebrow="Approved Intelligence"
        title="What is currently eligible for downstream use"
        description="These findings passed account review. Future campaign integration will consume this approved set rather than raw research notes."
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
