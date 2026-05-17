import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function ActionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: toolRunsData } = await supabase
    .from("tool_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const toolRuns = (toolRunsData ?? []) as Array<Record<string, any>>;
  const completed = toolRuns.filter((run) => run.status === "completed").length;
  const failed = toolRuns.filter((run) => run.status === "failed").length;
  const waiting = toolRuns.filter((run) => ["planned", "waiting_approval"].includes(run.status)).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Execution History"
        title="Track every external action."
        description="Review Zapier, GalaxyAI, Gmail, Facebook, and manual workflow actions so execution stays visible and accountable."
        primaryAction={{ label: "Open Zapier", href: "/zapier" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Total Actions" value={toolRuns.length} description="All tracked tool runs." dot="blue" />
        <WebsiteMetric label="Completed" value={completed} description="Successfully finished actions." dot="green" />
        <WebsiteMetric label="Waiting" value={waiting} description="Prepared or awaiting approval." dot="gold" />
        <WebsiteMetric label="Failed" value={failed} description="Actions needing attention." dot={failed ? "red" : "blue"} />
      </section>

      <WebsiteSection
        eyebrow="Audit Trail"
        title="Recent tool runs"
        description="Use this page to understand what VIP prepared, executed, completed, or failed."
      >
        {toolRuns.length ? (
          <div className={websiteStyles.cardGrid}>
            {toolRuns.map((run) => (
              <article key={run.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>{run.action_name}</h3>
                  <WebsiteBadge status={run.status} />
                </div>
                <p className={websiteStyles.cardMeta}>
                  {run.provider} • Created {formatDate(run.created_at)}
                </p>
                {run.error ? <p className={websiteStyles.cardText}><strong>Error:</strong> {run.error}</p> : null}
                {run.completed_at ? <p className={websiteStyles.cardMeta}>Completed {formatDate(run.completed_at)}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>No tool runs yet.</div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
