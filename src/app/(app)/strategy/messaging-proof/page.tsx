import Link from "next/link";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getMarketIntelligenceWorkspace } from "@/lib/market-intelligence/get-market-intelligence-workspace";
import { isMarketIntelligenceEnabled } from "@/lib/market-intelligence/feature";
import { getApprovedStrategyFoundation } from "@/lib/strategy/get-approved-strategy-foundation";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export default async function StrategyMessagingProofPage() {
  const workspace = await requireStrategyWorkspace();
  const marketIntelligenceEnabled = isMarketIntelligenceEnabled();
  const [foundation, marketIntelligence] = await Promise.all([
    getApprovedStrategyFoundation({
      supabase: workspace.supabase,
      accountId: workspace.accountId,
    }),
    marketIntelligenceEnabled
      ? getMarketIntelligenceWorkspace({
          supabase: workspace.supabase,
          accountId: workspace.accountId,
        })
      : Promise.resolve(null),
  ]);

  const cards = [
    ["Business Summary", foundation.evidence.businessSummary, "/strategy/brand-voice"],
    ["Audience Summary", foundation.evidence.audienceSummary, "/strategy/audiences"],
    ["Offer Summary", foundation.evidence.offerSummary, "/strategy/offerings"],
    ["Sales Outcomes", foundation.evidence.salesOutcomeSummary, "/strategy/brand-voice"],
    ["Differentiator", foundation.campaignDefaults.differentiator, "/strategy/offerings"],
    ["Proof Context", foundation.campaignDefaults.proofPoints, "/strategy/knowledge"],
  ] as const;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategy • Messaging & Proof"
        title="Build credible campaign guidance from account knowledge."
        description="Review the differentiators, proof context, sales outcomes, approved market intelligence, examples, and source material available to campaign strategy."
        primaryAction={{ label: "Review Overview", href: "/strategy" }}
        secondaryAction={
          marketIntelligenceEnabled
            ? { label: "Market Intelligence", href: "/research" }
            : { label: "Add Knowledge", href: "/strategy/knowledge" }
        }
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Knowledge Sources" value={foundation.evidence.knowledgeSources.length} description="Active business-memory sources." dot={foundation.evidence.knowledgeSources.length ? "green" : "gold"} />
        <WebsiteMetric label="Approved Examples" value={foundation.evidence.approvedExamples.length} description="Approved style and messaging examples." dot={foundation.evidence.approvedExamples.length ? "green" : "gold"} />
        <WebsiteMetric label="Differentiator" value={foundation.campaignDefaults.differentiator ? "Defined" : "Missing"} description="Strongest available point of difference." dot={foundation.campaignDefaults.differentiator ? "green" : "red"} />
        <WebsiteMetric label="Proof Context" value={foundation.campaignDefaults.proofPoints ? "Available" : "Missing"} description="Context available to strategy generation." dot={foundation.campaignDefaults.proofPoints ? "green" : "gold"} />
        {marketIntelligenceEnabled ? (
          <WebsiteMetric
            label="Approved Intelligence"
            value={marketIntelligence?.counts.approvedFindings ?? 0}
            description="Reviewed findings eligible for planning use."
            dot={marketIntelligence?.counts.approvedFindings ? "green" : "gold"}
            href="/research"
          />
        ) : null}
      </section>

      <WebsiteSection
        eyebrow="Messaging Foundation"
        title="Current messaging and proof context"
        description="Use the source links to improve any missing or incomplete strategy element."
      >
        <div className={websiteStyles.cardGrid}>
          {cards.map(([label, value, href]) => (
            <article key={label} className={websiteStyles.card}>
              <p className={websiteStyles.sectionEyebrow}>{label}</p>
              <p className={websiteStyles.cardText}>{value || "Not established yet."}</p>
              <div className="mt-4">
                <Link href={href} className={websiteStyles.link}>Update source →</Link>
              </div>
            </article>
          ))}
        </div>
      </WebsiteSection>

      {marketIntelligenceEnabled ? (
        <WebsiteSection
          eyebrow="Approved Market Intelligence"
          title="Reviewed external evidence"
          description="Only approved findings appear here. Draft and rejected research remain isolated from account strategy and campaigns."
        >
          <div className={websiteStyles.cardGrid}>
            {marketIntelligence?.approvedFindings.length ? (
              marketIntelligence.approvedFindings.map((finding) => (
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
                No approved market findings yet. Research must be reviewed before it can appear in Strategy.
              </div>
            )}
          </div>
        </WebsiteSection>
      ) : null}
    </WebsitePage>
  );
}
