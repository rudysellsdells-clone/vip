import { ContentExampleForm } from "@/components/knowledge/ContentExampleForm";
import { KnowledgeDocumentUploadForm } from "@/components/knowledge/KnowledgeDocumentUploadForm";
import { KnowledgeSourceForm } from "@/components/knowledge/KnowledgeSourceForm";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

function formatDate(value: string | null | undefined) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function truncate(value: string, maxLength: number) {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

export default async function StrategyKnowledgePage() {
  const workspace = await requireStrategyWorkspace();
  const [knowledgeResult, examplesResult] = await Promise.all([
    workspace.supabase
      .from("knowledge_sources")
      .select("*")
      .eq("account_id", workspace.accountId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(25),
    workspace.supabase
      .from("content_examples")
      .select("*")
      .eq("account_id", workspace.accountId)
      .eq("approved", true)
      .order("updated_at", { ascending: false })
      .limit(25),
  ]);

  const sources = (knowledgeResult.data ?? []) as Array<Record<string, any>>;
  const examples = (examplesResult.data ?? []) as Array<Record<string, any>>;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategy • Knowledge"
        title="Give VIP stronger source material."
        description="Store business documents, website copy, proof points, testimonials, sales language, and approved examples inside the active workspace."
        primaryAction={{ label: "Review Overview", href: "/strategy" }}
        secondaryAction={{ label: "Review Messaging & Proof", href: "/strategy/messaging-proof" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Knowledge Sources" value={sources.length} description="Active workspace memory entries." dot={sources.length ? "green" : "gold"} />
        <WebsiteMetric label="Approved Examples" value={examples.length} description="Approved style and messaging examples." dot={examples.length ? "green" : "gold"} />
        <WebsiteMetric label="Memory Status" value={sources.length || examples.length ? "Growing" : "Empty"} description="More relevant context supports stronger output." dot={sources.length || examples.length ? "green" : "red"} />
        <WebsiteMetric label="Edit Access" value={workspace.canManage ? "Enabled" : "View only"} description="Owners and admins can add source material." dot={workspace.canManage ? "green" : "gold"} />
      </section>

      {workspace.canManage ? (
        <>
          <section className={websiteStyles.twoColumn}>
            <div className={websiteStyles.formFrame}>
              <KnowledgeDocumentUploadForm />
            </div>
            <div className={websiteStyles.formFrame}>
              <KnowledgeSourceForm />
            </div>
          </section>
          <section className={websiteStyles.twoColumn}>
            <div className={websiteStyles.formFrame}>
              <ContentExampleForm />
            </div>
            <WebsiteSection
              eyebrow="Source Guidance"
              title="What belongs here"
              description="Use clean, relevant source material that helps VIP understand the business, customer, proof, process, and approved communication style."
            >
              <div className={websiteStyles.empty}>
                Strong sources include service pages, proposals, FAQs, sales decks, testimonials, case studies, brand guides, and approved campaign examples.
              </div>
            </WebsiteSection>
          </section>
        </>
      ) : (
        <div className={websiteStyles.empty}>
          You can review workspace knowledge, but only account owners and administrators can add sources or examples.
        </div>
      )}

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Sources"
          title="Knowledge sources"
          description="Business memory available to strategy and campaign generation."
        >
          <div className={websiteStyles.cardGrid}>
            {sources.length ? (
              sources.map((source) => (
                <article key={source.id} className={websiteStyles.card}>
                  <p className={websiteStyles.sectionEyebrow}>{source.source_type}</p>
                  <h3 className={websiteStyles.cardTitle}>{source.title}</h3>
                  <p className={websiteStyles.cardText}>
                    {source.summary || truncate(source.content, 220)}
                  </p>
                  <p className={websiteStyles.cardMeta}>Updated {formatDate(source.updated_at)}</p>
                </article>
              ))
            ) : (
              <div className={websiteStyles.empty}>No knowledge sources are saved for this workspace.</div>
            )}
          </div>
        </WebsiteSection>

        <WebsiteSection
          eyebrow="Examples"
          title="Approved content examples"
          description="Examples VIP can use to understand approved style, language, and campaign tone."
        >
          <div className={websiteStyles.cardGrid}>
            {examples.length ? (
              examples.map((example) => (
                <article key={example.id} className={websiteStyles.card}>
                  <p className={websiteStyles.sectionEyebrow}>{example.content_type}</p>
                  <h3 className={websiteStyles.cardTitle}>{example.title}</h3>
                  <p className={websiteStyles.cardText}>{truncate(example.content, 260)}</p>
                  {example.source ? <p className={websiteStyles.cardMeta}>Source: {example.source}</p> : null}
                </article>
              ))
            ) : (
              <div className={websiteStyles.empty}>No approved content examples are saved for this workspace.</div>
            )}
          </div>
        </WebsiteSection>
      </section>
    </WebsitePage>
  );
}
