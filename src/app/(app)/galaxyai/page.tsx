import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SyncGalaxyWorkflowsButton } from "@/components/galaxyai/SyncGalaxyWorkflowsButton";
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

export default async function GalaxyAiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [workflowsResult, runsResult] = await Promise.all([
    supabase.from("galaxyai_workflows").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50),
    supabase.from("galaxyai_runs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const workflows = (workflowsResult.data ?? []) as Array<Record<string, any>>;
  const runs = (runsResult.data ?? []) as Array<Record<string, any>>;
  const running = runs.filter((run) => ["queued", "running"].includes(run.status)).length;
  const completed = runs.filter((run) => run.status === "completed").length;
  const failed = runs.filter((run) => run.status === "failed").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="GalaxyAI"
        title="Creative workflow control center."
        description="Sync workflows, monitor creative runs, and pull finished GalaxyAI outputs back into VIP."
        primaryAction={{ label: "Review Assets", href: "/approvals" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Workflows" value={workflows.length} description="Saved GalaxyAI workflow references." dot="blue" />
        <WebsiteMetric label="Running" value={running} description="Queued or active creative runs." dot="purple" />
        <WebsiteMetric label="Completed" value={completed} description="Finished GalaxyAI runs." dot="green" />
        <WebsiteMetric label="Failed" value={failed} description="Runs needing attention." dot={failed ? "red" : "blue"} />
      </section>

      <WebsiteSection
        eyebrow="Sync"
        title="Workflow library"
        description="Keep VIP aligned with the workflows available in GalaxyAI."
      >
        <div className={websiteStyles.actionRow}>
          <SyncGalaxyWorkflowsButton />
        </div>

        {workflows.length ? (
          <div className={websiteStyles.cardGrid} style={{ marginTop: 24 }}>
            {workflows.map((workflow) => (
              <article key={workflow.id} className={websiteStyles.card}>
                <h3 className={websiteStyles.cardTitle}>{workflow.name}</h3>
                <p className={websiteStyles.cardMeta}>
                  {workflow.galaxy_workflow_id} • Last synced {formatDate(workflow.last_synced_at)}
                </p>
                {workflow.description ? <p className={websiteStyles.cardText}>{workflow.description}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty} style={{ marginTop: 24 }}>
            No GalaxyAI workflows synced yet.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Runs"
        title="Recent GalaxyAI runs"
        description="Monitor creative workflow execution status."
      >
        {runs.length ? (
          <div className={websiteStyles.cardGrid}>
            {runs.map((run) => (
              <article key={run.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>{run.galaxy_workflow_id ?? "GalaxyAI run"}</h3>
                  <WebsiteBadge status={run.status} />
                </div>
                <p className={websiteStyles.cardMeta}>
                  Created {formatDate(run.created_at)} • Completed {formatDate(run.completed_at)}
                </p>
                {run.error ? <p className={websiteStyles.cardText}><strong>Error:</strong> {run.error}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>No GalaxyAI runs yet.</div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
