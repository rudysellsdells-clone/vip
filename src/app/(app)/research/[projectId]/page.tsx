import Link from "next/link";
import { notFound } from "next/navigation";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import type { AutomatedMarketReport } from "@/lib/market-intelligence/automated-market-research";
import { isMarketIntelligenceEnabled } from "@/lib/market-intelligence/feature";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

type SourceRow = {
  id: string;
  title: string;
  source_url: string | null;
  publisher: string | null;
  summary: string | null;
  retrieved_at: string;
};

type FindingRow = {
  id: string;
  finding_type: string;
  title: string;
  summary: string;
  evidence: string | null;
  confidence_score: number | null;
  status: string;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatDate(value: unknown) {
  const date = string(value);
  if (!date) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function MarketResearchProjectPage({ params }: PageProps) {
  if (!isMarketIntelligenceEnabled()) notFound();

  const { projectId } = await params;
  const { supabase, accountId, accountName } = await requireStrategyWorkspace();

  const [projectResult, sourcesResult, findingsResult] = await Promise.all([
    supabase
      .from("market_research_projects")
      .select("*")
      .eq("id", projectId)
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("market_research_sources")
      .select("id,title,source_url,publisher,summary,retrieved_at")
      .eq("project_id", projectId)
      .eq("account_id", accountId)
      .eq("active", true)
      .order("retrieved_at", { ascending: false }),
    supabase
      .from("market_research_findings")
      .select("id,finding_type,title,summary,evidence,confidence_score,status")
      .eq("project_id", projectId)
      .eq("account_id", accountId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
  ]);

  if (projectResult.error) throw new Error(projectResult.error.message);
  if (!projectResult.data) notFound();
  if (sourcesResult.error) throw new Error(sourcesResult.error.message);
  if (findingsResult.error) throw new Error(findingsResult.error.message);

  const project = projectResult.data as Record<string, unknown>;
  const metadata = object(project.metadata);
  const automation = object(metadata.automation);
  const rawReport = object(metadata.automated_market_report);
  const report = Object.keys(rawReport).length
    ? (rawReport as unknown as AutomatedMarketReport)
    : null;
  const sources = (sourcesResult.data ?? []) as SourceRow[];
  const findings = (findingsResult.data ?? []) as FindingRow[];
  const failure = string(automation.error);
  const automationStatus = string(automation.status) || string(project.status);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow={`Market Intelligence • ${accountName}`}
        title={string(project.title) || "Market research project"}
        description={
          string(project.objective) ||
          "Review the saved report, scan status, cited sources, and findings for this market-research project."
        }
        primaryAction={{ label: "Back to Research", href: "/research" }}
        secondaryAction={{ label: "Strategy Workspace", href: "/strategy" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Scan Status"
          value={label(automationStatus || "unknown")}
          description={`Started ${formatDate(automation.started_at || project.started_at)}`}
          dot={automationStatus === "complete" ? "green" : automationStatus === "failed" ? "red" : "gold"}
        />
        <WebsiteMetric
          label="Cited Sources"
          value={sources.length}
          description="Web evidence saved for this project."
          dot={sources.length ? "green" : "gold"}
        />
        <WebsiteMetric
          label="Findings"
          value={findings.length}
          description="Draft, approved, or rejected intelligence."
          dot={findings.length ? "blue" : "gold"}
        />
        <WebsiteMetric
          label="Full Report"
          value={report ? "Available" : "Not saved"}
          description={report ? "The complete executive report is below." : "The scan ended before a complete report was stored."}
          dot={report ? "green" : "red"}
        />
      </section>

      {failure ? (
        <WebsiteSection
          eyebrow="Scan Failure Details"
          title="The scan ended before a complete report was saved"
          description="The project record is retained so the failure is visible and diagnosable rather than becoming a dead-end card."
        >
          <div className="border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-950">
            <p className="font-black">Recorded error</p>
            <p className="mt-2 whitespace-pre-wrap">{failure}</p>
            <p className="mt-4 text-xs font-semibold text-red-800">
              Failed {formatDate(automation.failed_at || project.completed_at)}. No complete report exists for this attempt. Return to Research and run a new scan after the current fix deploys.
            </p>
          </div>
        </WebsiteSection>
      ) : null}

      {report ? (
        <>
          <WebsiteSection
            eyebrow="Executive Report"
            title={report.reportTitle || "Automated market-position report"}
            description={report.executiveSummary || "The automated scan completed and saved this report."}
          >
            <div className="border-l-4 border-blue-500 bg-blue-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                Current Market Position
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-800">{report.marketPosition}</p>
            </div>
          </WebsiteSection>

          <WebsiteSection
            eyebrow="Competitive Landscape"
            title="Competitors reviewed"
            description="Observed competitor positioning, visible strengths, and openings identified by the scan."
          >
            <div className={websiteStyles.cardGrid}>
              {(report.competitors ?? []).map((competitor) => (
                <article key={competitor.name} className={websiteStyles.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className={websiteStyles.cardTitle}>{competitor.name}</h3>
                    {competitor.websiteUrl ? (
                      <a href={competitor.websiteUrl} target="_blank" rel="noreferrer" className={websiteStyles.link}>
                        Visit website →
                      </a>
                    ) : null}
                  </div>
                  <p className={websiteStyles.cardText}>{competitor.positioning}</p>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Strengths</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                    {(competitor.strengths ?? []).map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-amber-700">Openings</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                    {(competitor.weaknesses ?? []).map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </WebsiteSection>

          <WebsiteSection
            eyebrow="Opportunity Report"
            title="Likely fillable gaps"
            description="Practical openings the account may be able to pursue without inventing unsupported capabilities."
          >
            <div className={websiteStyles.cardGrid}>
              {(report.gaps ?? []).map((gap) => (
                <article key={gap.title} className={websiteStyles.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={websiteStyles.sectionEyebrow}>{label(gap.category)}</p>
                      <h3 className={websiteStyles.cardTitle}>{gap.title}</h3>
                    </div>
                    <span className="text-xs font-black text-slate-500">{gap.confidenceScore}% confidence</span>
                  </div>
                  <p className={websiteStyles.cardText}>{gap.description}</p>
                  <p className="mt-3 text-xs leading-5 text-slate-600"><strong>Why fillable:</strong> {gap.whyFillable}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-700"><strong>Recommended action:</strong> {gap.recommendedAction}</p>
                </article>
              ))}
            </div>
          </WebsiteSection>

          <WebsiteSection
            eyebrow="Demand and Risk"
            title="Search openings and watchouts"
            description="Demand themes worth testing alongside risks that should shape execution."
          >
            <div className={websiteStyles.twoColumn}>
              <div className="space-y-3">
                {(report.searchDemand ?? []).map((item) => (
                  <article key={item.topic} className={websiteStyles.card}>
                    <h3 className={websiteStyles.cardTitle}>{item.topic}</h3>
                    <p className={websiteStyles.cardText}>{item.opportunity}</p>
                    <p className={websiteStyles.cardMeta}>{item.intent} • {item.confidenceScore}% confidence</p>
                  </article>
                ))}
              </div>
              <div className="space-y-3">
                {(report.risks ?? []).map((risk) => (
                  <article key={risk.title} className={websiteStyles.card}>
                    <h3 className={websiteStyles.cardTitle}>{risk.title}</h3>
                    <p className={websiteStyles.cardText}>{risk.description}</p>
                    <p className="mt-3 text-xs leading-5 text-slate-600"><strong>Mitigation:</strong> {risk.mitigation}</p>
                  </article>
                ))}
              </div>
            </div>
          </WebsiteSection>
        </>
      ) : null}

      <WebsiteSection
        eyebrow="Evidence Register"
        title="Sources and findings saved for this scan"
        description="These records remain visible even when a scan fails before producing a complete executive report."
      >
        <div className={websiteStyles.twoColumn}>
          <div className="space-y-3">
            <p className={websiteStyles.sectionEyebrow}>Cited Sources</p>
            {sources.length ? sources.map((source) => (
              <article key={source.id} className={websiteStyles.card}>
                <h3 className={websiteStyles.cardTitle}>{source.title}</h3>
                <p className={websiteStyles.cardText}>{source.summary || "No source summary saved."}</p>
                <p className={websiteStyles.cardMeta}>{[source.publisher, `Retrieved ${formatDate(source.retrieved_at)}`].filter(Boolean).join(" • ")}</p>
                {source.source_url ? (
                  <a href={source.source_url} target="_blank" rel="noreferrer" className={websiteStyles.link}>Open source →</a>
                ) : null}
              </article>
            )) : <div className={websiteStyles.empty}>No sources were saved for this attempt.</div>}
          </div>

          <div className="space-y-3">
            <p className={websiteStyles.sectionEyebrow}>Findings</p>
            {findings.length ? findings.map((finding) => (
              <article key={finding.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={websiteStyles.sectionEyebrow}>{label(finding.finding_type)}</p>
                    <h3 className={websiteStyles.cardTitle}>{finding.title}</h3>
                  </div>
                  <span className="text-xs font-black uppercase text-slate-500">{finding.status}</span>
                </div>
                <p className={websiteStyles.cardText}>{finding.summary}</p>
                {finding.evidence ? <p className="mt-3 text-xs leading-5 text-slate-600">{finding.evidence}</p> : null}
                <p className={websiteStyles.cardMeta}>{finding.confidence_score !== null ? `${finding.confidence_score}% confidence` : "Confidence not scored"}</p>
              </article>
            )) : <div className={websiteStyles.empty}>No findings were saved for this attempt.</div>}
          </div>
        </div>
      </WebsiteSection>

      <div className="flex justify-start">
        <Link href="/research" className={websiteStyles.link}>← Back to Market Intelligence</Link>
      </div>
    </WebsitePage>
  );
}
