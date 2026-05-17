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

export default async function ZapierPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [toolRunsResult, policiesResult] = await Promise.all([
    supabase.from("tool_runs").select("*").eq("user_id", user.id).eq("provider", "zapier_mcp").order("created_at", { ascending: false }).limit(100),
    supabase.from("zapier_action_policies").select("*").eq("user_id", user.id).eq("active", true).order("created_at", { ascending: false }).limit(100),
  ]);

  const runs = (toolRunsResult.data ?? []) as Array<Record<string, any>>;
  const policies = (policiesResult.data ?? []) as Array<Record<string, any>>;
  const waiting = runs.filter((run) => ["planned", "waiting_approval"].includes(run.status)).length;
  const completed = runs.filter((run) => run.status === "completed").length;
  const failed = runs.filter((run) => run.status === "failed").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Zapier MCP"
        title="Prepare and audit business actions."
        description="Track Zapier MCP actions for Gmail drafts, Facebook publishing, and other approved business workflows."
        primaryAction={{ label: "Approved Assets", href: "/approvals" }}
        secondaryAction={{ label: "Actions", href: "/actions" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Zapier Runs" value={runs.length} description="Tracked Zapier MCP tool runs." dot="blue" />
        <WebsiteMetric label="Waiting" value={waiting} description="Prepared or waiting for approval." dot="gold" />
        <WebsiteMetric label="Completed" value={completed} description="Successfully completed actions." dot="green" />
        <WebsiteMetric label="Failed" value={failed} description="Actions needing attention." dot={failed ? "red" : "blue"} />
      </section>

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Policies"
          title="Action policies"
          description="These policies define which actions require approval and how risky they are."
        >
          {policies.length ? (
            <div className={websiteStyles.cardGrid}>
              {policies.map((policy) => (
                <article key={policy.id} className={websiteStyles.card}>
                  <h3 className={websiteStyles.cardTitle}>{policy.app_name}</h3>
                  <p className={websiteStyles.cardMeta}>{policy.action_name}</p>
                  <WebsiteBadge status={policy.risk_level} />
                  {policy.notes ? <p className={websiteStyles.cardText}>{policy.notes}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className={websiteStyles.empty}>No Zapier policies found.</div>
          )}
        </WebsiteSection>

        <WebsiteSection
          eyebrow="Runs"
          title="Recent Zapier actions"
          description="Monitor prepared, completed, and failed Zapier MCP runs."
        >
          {runs.length ? (
            <div className={websiteStyles.cardGrid}>
              {runs.map((run) => (
                <article key={run.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={websiteStyles.cardTitle}>{run.action_name}</h3>
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
            <div className={websiteStyles.empty}>No Zapier runs yet.</div>
          )}
        </WebsiteSection>
      </section>
    </WebsitePage>
  );
}
