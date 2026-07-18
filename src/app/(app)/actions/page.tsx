import { redirect } from "next/navigation";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ActionsPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;

  if (!activeAccountId) {
    redirect("/accounts");
  }

  const { data: accountAssetsData } = await supabase
    .from("generated_assets")
    .select("id")
    .eq("account_id", activeAccountId)
    .limit(1000);

  const accountAssetIds = ((accountAssetsData ?? []) as Array<Record<string, unknown>>)
    .map((asset) => String(asset.id ?? ""))
    .filter(Boolean);

  const [toolRunsResult, publishingRunsResult] = await Promise.all([
    supabase
      .from("tool_runs")
      .select("*")
      .eq("account_id", activeAccountId)
      .order("created_at", { ascending: false })
      .limit(100),
    accountAssetIds.length
      ? supabase
          .from("publishing_execution_runs")
          .select("*")
          .in("asset_id", accountAssetIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const toolRuns = (toolRunsResult.data ?? []) as Array<Record<string, unknown>>;
  const publishingRuns = (publishingRunsResult.data ?? []) as Array<Record<string, unknown>>;
  const completed =
    toolRuns.filter((run) => run.status === "completed").length +
    publishingRuns.filter((run) => run.status === "completed").length;
  const failed =
    toolRuns.filter((run) => run.status === "failed").length +
    publishingRuns.filter((run) => run.status === "failed").length;
  const waiting =
    toolRuns.filter((run) => ["planned", "waiting_approval"].includes(String(run.status))).length +
    publishingRuns.filter((run) => ["prepared", "sent_to_provider"].includes(String(run.status))).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Execution History"
        title="Review publishing and automation history"
        description={`This audit view is scoped to the active workspace: ${accountContext.activeAccountName ?? "Current workspace"}. Day-to-day publishing should start in Publish Center.`}
        primaryAction={{ label: "Publish Center", href: "/publishing-schedule" }}
        secondaryAction={{ label: "Review Content", href: "/approvals" }}
      />

      <WebsiteSection
        eyebrow="Active Workspace"
        title={accountContext.activeAccountName ?? "Current workspace"}
        description="Only publishing runs and legacy tool runs tied to this workspace are shown here."
      >
        <article className={websiteStyles.card}>
          <div className="flex flex-wrap gap-2">
            <span className={websiteStyles.badge}>Workspace ID: {activeAccountId}</span>
            <span className={websiteStyles.badge}>Role: {accountContext.activeAccountRole ?? "member"}</span>
            {accountContext.isMaster ? <span className={websiteStyles.badge}>MASTER preview</span> : null}
          </div>
        </article>
      </WebsiteSection>

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Total Actions"
          value={toolRuns.length + publishingRuns.length}
          description="Publishing executions and legacy tool runs."
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
        eyebrow="Canonical Publishing"
        title="Recent publishing executions"
        description="These are the canonical publishing execution records for LinkedIn, Facebook, Gmail, WordPress, and other provider-backed publishing actions."
      >
        {publishingRuns.length ? (
          <div className={websiteStyles.cardGrid}>
            {publishingRuns.map((run) => (
              <article key={String(run.id)} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>
                    {String(run.destination || run.channel || "Publishing execution")}
                  </h3>
                  <WebsiteBadge status={String(run.status)} />
                </div>

                <p className={websiteStyles.cardMeta}>
                  {String(run.provider)} • {String(run.channel)} • Created {formatDate(String(run.created_at))}
                </p>

                <p className={websiteStyles.cardText}>
                  <strong>Action:</strong> {String(run.action_key || "Not recorded")}
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

                {run.asset_id ? (
                  <div className={websiteStyles.actionRow}>
                    <a href={`/assets/${String(run.asset_id)}`} className={websiteStyles.link}>
                      Open asset →
                    </a>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No canonical publishing executions yet. Use Publish Center to publish approved assets.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Legacy Actions"
        title="Recent legacy tool runs"
        description="Tool runs remain available for compatibility and historical audit. New publishing activity should use the canonical Publish Center flow."
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

                {String(run.status) === "planned" || String(run.status) === "waiting_approval" || String(run.status) === "failed" ? (
                  <div className={websiteStyles.actionRow}>
                    <span className={websiteStyles.badge}>Preflight review only</span>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>No legacy tool runs yet.</div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}