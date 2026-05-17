import { redirect } from "next/navigation";
import { ExecuteToolRunButton } from "@/components/actions/ExecuteToolRunButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function canExecute(run: Record<string, unknown>) {
  return (
    run.provider === "zapier_mcp" &&
    typeof run.status === "string" &&
    ["planned", "waiting_approval", "failed"].includes(run.status)
  );
}

function getExecuteLabel(actionName: unknown) {
  const action = typeof actionName === "string" ? actionName.toLowerCase() : "";

  if (action.includes("linkedin")) return "Send to LinkedIn MCP";
  if (action.includes("facebook")) return "Send to Facebook MCP";
  if (action.includes("gmail")) return "Create Gmail Draft";

  return "Execute Action";
}

export default async function ActionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: toolRunsData } = await supabase
    .from("tool_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const toolRuns = (toolRunsData ?? []) as Array<Record<string, unknown>>;
  const completed = toolRuns.filter((run) => run.status === "completed").length;
  const failed = toolRuns.filter((run) => run.status === "failed").length;
  const waiting = toolRuns.filter((run) =>
    ["planned", "waiting_approval"].includes(String(run.status))
  ).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Execution History"
        title="Track and execute approved actions."
        description="Review Zapier, GalaxyAI, Gmail, Facebook, LinkedIn, and manual workflow actions so execution stays visible and accountable."
        primaryAction={{ label: "Review Assets", href: "/approvals" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Total Actions"
          value={toolRuns.length}
          description="All tracked tool runs."
          dot="blue"
        />
        <WebsiteMetric
          label="Completed"
          value={completed}
          description="Successfully finished actions."
          dot="green"
        />
        <WebsiteMetric
          label="Waiting"
          value={waiting}
          description="Prepared or awaiting execution."
          dot="gold"
        />
        <WebsiteMetric
          label="Failed"
          value={failed}
          description="Actions needing attention."
          dot={failed ? "red" : "blue"}
        />
      </section>

      <WebsiteSection
        eyebrow="Action Queue"
        title="Recent tool runs"
        description="Prepared Zapier actions can be executed here. LinkedIn company page posts now use the same execution path as Gmail and Facebook."
      >
        {toolRuns.length ? (
          <div className={websiteStyles.cardGrid}>
            {toolRuns.map((run) => (
              <article key={String(run.id)} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>{String(run.action_name)}</h3>
                  <WebsiteBadge status={String(run.status)} />
                </div>

                <p className={websiteStyles.cardMeta}>
                  {String(run.provider)} • Created {formatDate(String(run.created_at))}
                </p>

                {run.error ? (
                  <p className={websiteStyles.cardText}>
                    <strong>Error:</strong> {String(run.error)}
                  </p>
                ) : null}

                {run.completed_at ? (
                  <p className={websiteStyles.cardMeta}>
                    Completed {formatDate(String(run.completed_at))}
                  </p>
                ) : null}

                {canExecute(run) ? (
                  <div className={websiteStyles.actionRow}>
                    <ExecuteToolRunButton
                      toolRunId={String(run.id)}
                      label={getExecuteLabel(run.action_name)}
                    />
                  </div>
                ) : null}
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
