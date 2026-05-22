import Link from "next/link";
import { redirect } from "next/navigation";
import { ExecuteApprovedAssetButton } from "@/components/publishing/ExecuteApprovedAssetButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { PUBLISHABLE_ASSET_TYPES } from "@/lib/publishing/asset-routing";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function typeLabel(value: string | null | undefined) {
  return String(value ?? "content").replaceAll("_", " ");
}

function channelLabel(assetType: string) {
  switch (assetType) {
    case "linkedin_post":
      return "LinkedIn";
    case "facebook_post":
      return "Facebook";
    case "email":
      return "Gmail";
    case "video_script":
      return "GalaxyAI";
    default:
      return "Execution";
  }
}

export default async function PublishingReadyPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: approvedData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .in("asset_type", PUBLISHABLE_ASSET_TYPES)
    .order("updated_at", { ascending: false })
    .limit(24);

  const { data: runsData } = await supabase
    .from("publishing_execution_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const approvedAssets = (approvedData ?? []) as Array<Record<string, any>>;
  const runs = (runsData ?? []) as Array<Record<string, any>>;
  const completed = runs.filter((run) => run.status === "completed").length;
  const failed = runs.filter((run) => run.status === "failed").length;
  const prepared = runs.filter((run) => run.status === "prepared").length;

  const completedKeys = new Set(
    runs
      .filter((run) => run.status === "completed")
      .map((run) => `${run.asset_id}:${run.channel}`)
  );

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publishing Readiness"
        title="Execute approved assets safely."
        description="Approved repurposed assets can now move toward LinkedIn, Facebook, Gmail drafts, or GalaxyAI media requests with execution tracking and duplicate protection."
        primaryAction={{ label: "Review Assets", href: "/approvals" }}
        secondaryAction={{ label: "Repurposing", href: "/content-repurposing" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Approved Assets"
          value={approvedAssets.length}
          description="Ready for execution."
          dot="blue"
        />
        <WebsiteMetric
          label="Completed Runs"
          value={completed}
          description="Execution records completed."
          dot="green"
        />
        <WebsiteMetric
          label="Prepared"
          value={prepared}
          description="Prepared but not fully executed."
          dot="gold"
        />
        <WebsiteMetric
          label="Failed"
          value={failed}
          description="Needs review or reconfiguration."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Ready"
        title="Approved assets ready to run"
        description="VIP only executes approved assets. Completed runs are tracked to help prevent duplicate execution."
      >
        {approvedAssets.length ? (
          <div className={websiteStyles.cardGrid}>
            {approvedAssets.map((asset) => {
              const channel = channelLabel(asset.asset_type).toLowerCase();
              const alreadyCompleted = completedKeys.has(`${asset.id}:${channel}`);

              return (
                <article key={asset.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap gap-2">
                    <WebsiteBadge status={asset.status ?? "approved"} />
                    <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
                    <span className={websiteStyles.badge}>{channelLabel(asset.asset_type)}</span>
                    {alreadyCompleted ? (
                      <span className={websiteStyles.badge}>Completed run exists</span>
                    ) : null}
                  </div>

                  <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                    <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                      {asset.title}
                    </Link>
                  </h3>

                  <p className={websiteStyles.cardMeta}>
                    Updated {formatDate(asset.updated_at ?? asset.created_at)}
                  </p>

                  <p className={websiteStyles.cardText}>
                    {String(asset.content ?? "").slice(0, 220)}...
                  </p>

                  <div className={websiteStyles.actionRow}>
                    <ExecuteApprovedAssetButton
                      assetId={asset.id}
                      assetType={asset.asset_type}
                      disabled={alreadyCompleted}
                    />
                    <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                      Open asset →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No approved publishable assets yet. Approve LinkedIn, Facebook, email, or video assets to see them here.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="History"
        title="Recent publishing execution runs"
        description="This is the durable record of publishing/outreach execution attempts from this readiness screen."
      >
        {runs.length ? (
          <div className={websiteStyles.cardGrid}>
            {runs.map((run) => (
              <article key={run.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={run.status ?? "prepared"} />
                  <span className={websiteStyles.badge}>{run.provider}</span>
                  <span className={websiteStyles.badge}>{run.channel}</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  {run.destination ?? run.channel}
                </h3>

                <p className={websiteStyles.cardMeta}>
                  {formatDate(run.created_at)} • {run.action_key}
                </p>

                {run.error ? (
                  <p className={websiteStyles.cardText}>
                    <strong>Error:</strong> {run.error}
                  </p>
                ) : null}

                <div className={websiteStyles.actionRow}>
                  {run.asset_id ? (
                    <Link href={`/assets/${run.asset_id}`} className={websiteStyles.link}>
                      Open asset →
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No publishing execution runs yet.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
