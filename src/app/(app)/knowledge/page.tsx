import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KnowledgeSourceForm } from "@/components/knowledge/KnowledgeSourceForm";
import { ContentExampleForm } from "@/components/knowledge/ContentExampleForm";
import { VipEmptyState, VipMetricCard, VipSection } from "@/components/vip-ui/VipCards";
import { VipHero, VipPageShell } from "@/components/vip-ui/VipPageShell";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: knowledgeSources } = await supabase
    .from("knowledge_sources")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(25);

  const { data: contentExamples } = await supabase
    .from("content_examples")
    .select("*")
    .eq("user_id", user.id)
    .eq("approved", true)
    .order("updated_at", { ascending: false })
    .limit(25);

  const sources = (knowledgeSources ?? []) as any[];
  const examples = (contentExamples ?? []) as any[];

  return (
    <VipPageShell>
      <VipHero
        eyebrow="Business Memory"
        title="Knowledge library"
        description="Store website copy, service pages, scripts, testimonials, proof points, and examples so VIP can create stronger campaigns."
        primaryAction={{ label: "Brand Voice", href: "/brand-voice" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <VipMetricCard label="Knowledge Sources" value={sources.length} description="Business memory entries." tone="info" />
        <VipMetricCard label="Content Examples" value={examples.length} description="Approved style examples." tone="purple" />
        <VipMetricCard label="Memory Status" value={sources.length || examples.length ? "Growing" : "Empty"} description="More context creates better outputs." tone={sources.length || examples.length ? "success" : "warning"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="vip-card rounded-[1.75rem] p-1">
          <KnowledgeSourceForm />
        </div>
        <div className="vip-card rounded-[1.75rem] p-1">
          <ContentExampleForm />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <VipSection title="Knowledge sources" description="Business memory VIP can use for strategy and campaign generation.">
          <div className="space-y-3">
            {sources.length ? (
              sources.map((source) => (
                <article key={source.id} className="vip-card-hover rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">{source.source_type}</p>
                      <h3 className="mt-1 font-black text-slate-950">{source.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {source.summary ? source.summary : truncate(source.content, 220)}
                      </p>
                      {source.source_url ? <p className="mt-2 break-all text-xs text-sky-700">{source.source_url}</p> : null}
                    </div>
                    <span className="text-xs font-bold text-slate-400">{formatDate(source.updated_at)}</span>
                  </div>
                </article>
              ))
            ) : (
              <VipEmptyState title="No knowledge sources yet" description="Add service pages, website copy, notes, testimonials, or scripts." />
            )}
          </div>
        </VipSection>

        <VipSection title="Content examples" description="Approved examples of Rudy's style, sales language, and campaign tone.">
          <div className="space-y-3">
            {examples.length ? (
              examples.map((example) => (
                <article key={example.id} className="vip-card-hover rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">{example.content_type}</p>
                  <h3 className="mt-1 font-black text-slate-950">{example.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {truncate(example.content, 260)}
                  </p>
                  {example.source ? <p className="mt-2 text-xs font-bold text-slate-400">Source: {example.source}</p> : null}
                </article>
              ))
            ) : (
              <VipEmptyState title="No content examples yet" description="Add emails, social posts, scripts, or sales copy that sound like Rudy." />
            )}
          </div>
        </VipSection>
      </section>
    </VipPageShell>
  );
}
