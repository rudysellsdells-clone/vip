import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import styles from "./DashboardWebsite.module.css";

type RecentItem = {
  id: string;
  title: string;
  subtitle: string;
  href?: string;
  status?: string | null;
};

const services = [
  {
    title: "AIO + SEO",
    description:
      "Improve how Rudy's clients show up in AI answers, search engines, and local discovery.",
    href: "/campaigns",
  },
  {
    title: "Content Creation",
    description:
      "Turn strategy into emails, social posts, scripts, and approval-ready campaign assets.",
    href: "/approvals",
  },
  {
    title: "Marketing Automation",
    description:
      "Use approved assets to create drafts, trigger workflows, and keep follow-up moving.",
    href: "/zapier",
  },
  {
    title: "Revenue Pipeline",
    description:
      "Connect campaigns to prospects, opportunities, projects, and retainers.",
    href: "/opportunities",
  },
];

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "Unknown";

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function Metric({
  label,
  value,
  description,
  href,
  dotClass,
}: {
  label: string;
  value: number | string;
  description: string;
  href: string;
  dotClass?: string;
}) {
  return (
    <Link href={href} className={styles.metric}>
      <div className={styles.metricTop}>
        <p className={styles.metricLabel}>{label}</p>
        <span className={[styles.metricDot, dotClass ?? ""].join(" ")} />
      </div>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricDescription}>{description}</p>
    </Link>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      {eyebrow ? <p className={styles.sectionEyebrow}>{eyebrow}</p> : null}
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description ? <p className={styles.sectionCopy}>{description}</p> : null}
      {children}
    </section>
  );
}

function RecentList({
  title,
  description,
  items,
  emptyMessage,
}: {
  title: string;
  description: string;
  items: RecentItem[];
  emptyMessage: string;
}) {
  return (
    <Section title={title} description={description}>
      <div className={styles.listStack}>
        {items.length ? (
          items.map((item) => {
            const card = (
              <div className={styles.listCard}>
                <div className={styles.listCardInner}>
                  <div>
                    <h3 className={styles.listTitle}>{item.title}</h3>
                    <p className={styles.listSubtitle}>{item.subtitle}</p>
                  </div>
                  {item.status ? (
                    <span className={styles.statusPill}>
                      {formatStatus(item.status)}
                    </span>
                  ) : null}
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href} className={styles.listCard}>
                <div className={styles.listCardInner}>
                  <div>
                    <h3 className={styles.listTitle}>{item.title}</h3>
                    <p className={styles.listSubtitle}>{item.subtitle}</p>
                  </div>
                  {item.status ? (
                    <span className={styles.statusPill}>
                      {formatStatus(item.status)}
                    </span>
                  ) : null}
                </div>
              </Link>
            ) : (
              <div key={item.id}>{card}</div>
            );
          })
        ) : (
          <div className={styles.empty}>{emptyMessage}</div>
        )}
      </div>
    </Section>
  );
}

function NextActionCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link href={href} className={styles.actionCard}>
      <p className={styles.actionLabel}>Next move</p>
      <h3 className={styles.actionTitle}>{title}</h3>
      <p className={styles.actionCopy}>{description}</p>
      <p className={styles.actionCta}>{cta} →</p>
    </Link>
  );
}

function getNextActions(input: {
  pendingAssets: number;
  failedToolRuns: number;
  activeGalaxyRuns: number;
  campaigns: number;
  preparedActions: number;
}) {
  const actions: Array<{
    title: string;
    description: string;
    href: string;
    cta: string;
  }> = [];

  if (input.campaigns === 0) {
    actions.push({
      title: "Create the first campaign",
      description:
        "Start with one revenue-focused service, buyer segment, offer, and CTA.",
      href: "/campaigns",
      cta: "Create campaign",
    });
  }

  if (input.pendingAssets > 0) {
    actions.push({
      title: "Review campaign assets",
      description:
        "Approve, reject, or revise generated assets before anything external happens.",
      href: "/approvals",
      cta: "Open approvals",
    });
  }

  if (input.failedToolRuns > 0) {
    actions.push({
      title: "Resolve failed actions",
      description:
        "Review failed executions so Gmail, Facebook, GalaxyAI, or Zapier work does not stall.",
      href: "/actions",
      cta: "Review actions",
    });
  }

  if (input.activeGalaxyRuns > 0) {
    actions.push({
      title: "Check GalaxyAI outputs",
      description:
        "Pull completed creative workflow results back into VIP as campaign assets.",
      href: "/galaxyai",
      cta: "Open GalaxyAI",
    });
  }

  if (input.preparedActions > 0) {
    actions.push({
      title: "Execute prepared actions",
      description:
        "Create Gmail drafts or publish approved Facebook posts from the safety queue.",
      href: "/zapier",
      cta: "Open Zapier",
    });
  }

  actions.push({
    title: "Build the revenue pipeline",
    description:
      "Add prospects and opportunities so campaigns connect to projects and retainers.",
    href: "/prospects",
    cta: "Open prospects",
  });

  return actions.slice(0, 4);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    campaignsResult,
    pendingAssetsResult,
    approvedAssetsResult,
    publishedAssetsResult,
    galaxyRunsResult,
    toolRunsResult,
    activityResult,
    prospectsResult,
    opportunitiesResult,
  ] = await Promise.all([
    supabase.from("campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("generated_assets").select("*").eq("user_id", user.id).in("status", ["needs_review", "revision_requested"]).order("created_at", { ascending: false }).limit(8),
    supabase.from("generated_assets").select("*").eq("user_id", user.id).eq("status", "approved").order("updated_at", { ascending: false }).limit(8),
    supabase.from("generated_assets").select("*").eq("user_id", user.id).eq("status", "published").order("updated_at", { ascending: false }).limit(8),
    supabase.from("galaxyai_runs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("tool_runs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("activity_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("prospects").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(25),
    supabase.from("opportunities").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(25),
  ]);

  const campaigns = (campaignsResult.data ?? []) as Array<Record<string, any>>;
  const pendingAssets = (pendingAssetsResult.data ?? []) as Array<Record<string, any>>;
  const approvedAssets = (approvedAssetsResult.data ?? []) as Array<Record<string, any>>;
  const publishedAssets = (publishedAssetsResult.data ?? []) as Array<Record<string, any>>;
  const galaxyRuns = (galaxyRunsResult.data ?? []) as Array<Record<string, any>>;
  const toolRuns = (toolRunsResult.data ?? []) as Array<Record<string, any>>;
  const activities = (activityResult.data ?? []) as Array<Record<string, any>>;
  const prospects = (prospectsResult.data ?? []) as Array<Record<string, any>>;
  const opportunities = (opportunitiesResult.data ?? []) as Array<Record<string, any>>;

  const activeGalaxyRuns = galaxyRuns.filter((run) =>
    ["queued", "running"].includes(run.status)
  );
  const failedToolRuns = toolRuns.filter((run) => run.status === "failed");
  const preparedToolRuns = toolRuns.filter((run) =>
    ["planned", "waiting_approval", "failed"].includes(run.status)
  );
  const completedToolRuns = toolRuns.filter((run) => run.status === "completed");
  const openOpportunities = opportunities.filter(
    (opportunity) => !["won", "lost", "paused"].includes(opportunity.stage)
  );

  const nextActions = getNextActions({
    pendingAssets: pendingAssets.length,
    failedToolRuns: failedToolRuns.length,
    activeGalaxyRuns: activeGalaxyRuns.length,
    campaigns: campaigns.length,
    preparedActions: preparedToolRuns.length,
  });

  const recentCampaignItems: RecentItem[] = campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.name,
    subtitle: `${campaign.buyer_segment ?? "No buyer segment"} • ${formatDate(campaign.created_at)}`,
    href: `/campaigns/${campaign.id}`,
    status: campaign.status,
  }));

  const pendingAssetItems: RecentItem[] = pendingAssets.map((asset) => ({
    id: asset.id,
    title: asset.title ?? `${asset.asset_type} asset`,
    subtitle: `${asset.asset_type} • ${formatDate(asset.created_at)}`,
    href: `/assets/${asset.id}`,
    status: asset.status,
  }));

  const toolRunItems: RecentItem[] = toolRuns.slice(0, 6).map((toolRun) => ({
    id: toolRun.id,
    title: toolRun.action_name,
    subtitle: `${toolRun.provider} • ${formatDate(toolRun.created_at)}`,
    href: "/actions",
    status: toolRun.status,
  }));

  const activityItems: RecentItem[] = activities.slice(0, 6).map((activity) => ({
    id: activity.id,
    title: activity.title,
    subtitle: `${activity.activity_type} • ${formatDate(activity.created_at)}`,
  }));

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <p className={styles.eyebrow}>Web Search Pros Command Center</p>
            <h1 className={styles.heroTitle}>
              Revolutionize your digital presence from one clean dashboard.
            </h1>
            <p className={styles.heroCopy}>
              VIP helps Rudy create campaigns, review assets, run approved
              actions, and connect marketing work to real prospects and revenue
              opportunities.
            </p>

            <div className={styles.heroActions}>
              <Link
                href="/campaigns"
                className={[styles.button, styles.buttonPrimary].join(" ")}
              >
                Create Campaign
              </Link>
              <Link
                href="/approvals"
                className={[styles.button, styles.buttonSecondary].join(" ")}
              >
                Review Assets
              </Link>
              <Link
                href="/prospects"
                className={[styles.button, styles.buttonSecondary].join(" ")}
              >
                Build Pipeline
              </Link>
            </div>
          </div>

          <aside className={styles.heroPanel}>
            <p className={styles.panelTitle}>Operating Status</p>
            <div className={styles.statusGrid}>
              <div className={styles.statusBox}>
                <p className={styles.statusLabel}>Pending review</p>
                <p className={styles.statusValue}>{pendingAssets.length}</p>
              </div>
              <div className={styles.statusBox}>
                <p className={styles.statusLabel}>Completed actions</p>
                <p className={styles.statusValue}>{completedToolRuns.length}</p>
              </div>
              <div className={styles.statusBox}>
                <p className={styles.statusLabel}>Prospects</p>
                <p className={styles.statusValue}>{prospects.length}</p>
              </div>
              <div className={styles.statusBox}>
                <p className={styles.statusLabel}>Open deals</p>
                <p className={styles.statusValue}>{openOpportunities.length}</p>
              </div>
            </div>

            <div className={styles.missionBox}>
              <p>
                Mission: expand reach, amplify brand story, and create
                authentic connections between businesses and their audiences.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <Metric
          label="Campaigns"
          value={campaigns.length}
          description="Revenue-focused campaigns in motion."
          href="/campaigns"
        />
        <Metric
          label="Pending Review"
          value={pendingAssets.length}
          description="Assets waiting for approval or revision."
          href="/approvals"
          dotClass={styles.dotGold}
        />
        <Metric
          label="Approved"
          value={approvedAssets.length}
          description="Ready for safe execution."
          href="/zapier"
          dotClass={styles.dotGreen}
        />
        <Metric
          label="Published"
          value={publishedAssets.length}
          description="Completed public publishing actions."
          href="/actions"
          dotClass={styles.dotPurple}
        />
        <Metric
          label="Failed"
          value={failedToolRuns.length}
          description="Actions that need attention."
          href="/actions"
          dotClass={failedToolRuns.length ? styles.dotRed : undefined}
        />
      </section>

      <section className={styles.twoColumn}>
        <Section
          eyebrow="Digital Marketing Services"
          title="Organized around the services Rudy sells."
          description="The dashboard now uses the same service-led structure as Web Search Pros: visibility, content, automation, and revenue."
        >
          <div className={styles.serviceGrid}>
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className={styles.serviceCard}
              >
                <span className={styles.serviceIcon}>{service.title.slice(0, 1)}</span>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
                <p className={styles.serviceCopy}>{service.description}</p>
              </Link>
            ))}
          </div>
        </Section>

        <section className={styles.nextPanel}>
          <div className={styles.nextHeader}>
            <p className={styles.eyebrow}>Recommended Next Actions</p>
            <h2>Keep the marketing engine moving.</h2>
            <p>
              VIP is prioritizing work that keeps campaigns, approvals,
              external actions, and revenue follow-up from getting stuck.
            </p>
          </div>

          <div className={styles.actionGrid}>
            {nextActions.map((action) => (
              <NextActionCard key={action.title} {...action} />
            ))}
          </div>
        </section>
      </section>

      <section className={styles.twoColumn}>
        <RecentList
          title="Recent campaigns"
          description="Newest campaign work in Rudy's Marketing Twin."
          items={recentCampaignItems}
          emptyMessage="No campaigns yet."
        />

        <RecentList
          title="Needs your attention"
          description="Approval-ready assets that need review, revision, or execution."
          items={pendingAssetItems}
          emptyMessage="No pending assets right now."
        />
      </section>

      <section className={styles.twoColumn}>
        <RecentList
          title="Recent executions"
          description="Latest Zapier, GalaxyAI, Gmail, Facebook, and tool actions."
          items={toolRunItems}
          emptyMessage="No tool runs yet."
        />

        <RecentList
          title="Recent activity"
          description="Latest updates across campaigns, assets, approvals, and pipeline."
          items={activityItems}
          emptyMessage="No activity yet."
        />
      </section>
    </main>
  );
}
