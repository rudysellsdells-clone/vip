import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KnowledgeSourceForm } from "@/components/knowledge/KnowledgeSourceForm";
import { ContentExampleForm } from "@/components/knowledge/ContentExampleForm";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength).trim()}...`;
}

export default async function KnowledgePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Sprint 5.6
        </p>
        <h1 className="text-3xl font-bold">Knowledge Library</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Store website copy, service pages, social examples, scripts, testimonials, and business context so VIP can create stronger campaigns.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <KnowledgeSourceForm />
        <ContentExampleForm />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Knowledge Sources</h2>
          <p className="mt-1 text-sm text-slate-500">
            Business memory VIP can use for strategy and campaign generation.
          </p>

          <div className="mt-5 space-y-3">
            {knowledgeSources?.length ? (
              knowledgeSources.map((source) => (
                <article key={source.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {source.source_type}
                      </p>
                      <h3 className="mt-1 font-semibold">{source.title}</h3>
                      {source.summary ? (
                        <p className="mt-2 text-sm text-slate-600">{source.summary}</p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">
                          {truncate(source.content, 220)}
                        </p>
                      )}
                      {source.source_url ? (
                        <p className="mt-2 text-xs text-slate-500">{source.source_url}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(source.updated_at)}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                No knowledge sources yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Content Examples</h2>
          <p className="mt-1 text-sm text-slate-500">
            Approved examples of Rudy&apos;s style, sales language, and campaign tone.
          </p>

          <div className="mt-5 space-y-3">
            {contentExamples?.length ? (
              contentExamples.map((example) => (
                <article key={example.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {example.content_type}
                      </p>
                      <h3 className="mt-1 font-semibold">{example.title}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                        {truncate(example.content, 260)}
                      </p>
                      {example.source ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Source: {example.source}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(example.updated_at)}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                No content examples yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
