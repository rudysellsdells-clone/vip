import { redirect } from "next/navigation";
import { ContentExampleForm } from "@/components/knowledge/ContentExampleForm";
import { KnowledgeSourceForm } from "@/components/knowledge/KnowledgeSourceForm";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getActiveWorkspaceForUser } from "@/lib/accounts/active-workspace";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function truncate(value: string, maxLength: number) {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

export default async function KnowledgePage() {
  const supabase = untypedSupabase(await createClient());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

  if (!workspace) redirect("/accounts");

  const activeWorkspace = workspace!;

  const { data: knowledgeSources } = await supabase
    .from("knowledge_sources")
    .select("*")
    .eq("account_id", activeWorkspace.activeAccountId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(25);

  const { data: contentExamples } = await supabase
    .from("content_examples")
    .select("*")
    .eq("account_id", activeWorkspace.activeAccountId)
    .eq("approved", true)
    .order("updated_at", { ascending: false })
    .limit(25);

  const sources = (knowledgeSources ?? []) as Array<Record<string, any>>;
  const examples = (contentExamples ?? []) as Array<Record<string, any>>;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow={`Business Memory • ${activeWorkspace.activeAccountName}`}
        title="Give VIP better source material."
        description="Store service pages, website copy, examples, proof points, testimonials, and notes inside the active workspace so every campaign becomes more specific."
        primaryAction={{ label: "Brand Voice", href: "/brand-voice" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Knowledge Sources" value={sources.length} description="Workspace memory entries." dot="blue" />
        <WebsiteMetric label="Content Examples" value={examples.length} description="Approved style examples." dot="purple" />
        <WebsiteMetric label="Memory Status" value={sources.length || examples.length ? "Growing" : "Empty"} description="More context creates better outputs." dot={sources.length || examples.length ? "green" : "gold"} />
        <WebsiteMetric label="Next Step" value="Add" description="Paste useful sales or service material." dot="gold" />
      </section>

      <section className={websiteStyles.twoColumn}>
        <div className={websiteStyles.formFrame}>
          <KnowledgeSourceForm />
        </div>
        <div className={websiteStyles.formFrame}>
          <ContentExampleForm />
        </div>
      </section>

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Sources"
          title="Knowledge sources"
          description="Business memory VIP can use for strategy and campaign generation."
        >
          <div className={websiteStyles.cardGrid}>
            {sources.length ? (
              sources.map((source) => (
                <article key={source.id} className={websiteStyles.card}>
                  <p className={websiteStyles.sectionEyebrow}>{source.source_type}</p>
                  <h3 className={websiteStyles.cardTitle}>{source.title}</h3>
                  <p className={websiteStyles.cardText}>
                    {source.summary ? source.summary : truncate(source.content, 220)}
                  </p>
                  <p className={websiteStyles.cardMeta}>Updated {formatDate(source.updated_at)}</p>
                </article>
              ))
            ) : (
              <div className={websiteStyles.empty}>No knowledge sources yet for this workspace.</div>
            )}
          </div>
        </WebsiteSection>

        <WebsiteSection
          eyebrow="Examples"
          title="Content examples"
          description="Approved examples of style, sales language, and campaign tone."
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
              <div className={websiteStyles.empty}>No content examples yet for this workspace.</div>
            )}
          </div>
        </WebsiteSection>
      </section>
    </WebsitePage>
  );
}
