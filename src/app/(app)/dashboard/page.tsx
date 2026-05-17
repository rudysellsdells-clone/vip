import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type MetricTone = "blue" | "green" | "gold" | "purple" | "slate";

type DashboardMetricProps = {
  label: string;
  value: number | string;
  description: string;
  href: string;
  tone?: MetricTone;
};

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

const toneClasses: Record<MetricTone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-950",
  green: "border-emerald-100 bg-emerald-50 text-emerald-950",
  gold: "border-amber-100 bg-amber-50 text-amber-950",
  purple: "border-violet-100 bg-violet-50 text-violet-950",
  slate: "border-slate-200 bg-white text-slate-950",
};

const dotClasses: Record<MetricTone, string> = {
  blue: "bg-blue-600",
  green: "bg-emerald-600",
  gold: "bg-amber-500",
  purple: "bg-violet-600",
  slate: "bg-slate-500",
};

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

function statusClass(status: string | null | undefined) {
  switch (status) {
    case "approved":
    case "completed":
    case "won":
    case "qualified":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "needs_review":
    case "waiting_approval":
    case "revision_requested":
    case "proposal_needed":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "failed":
    case "rejected":
    case "lost":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "published":
    case "asset_pack_generated":
    case "active_opportunity":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "running":
    case "queued":
      return "border-violet-200 bg-violet-50 text-violet-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function StatusPill({ status }: { status: string | null | undefined }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-bold",
        statusClass(status),
      ].join(" ")}
    >
      {formatStatus(status)}
    </span>
  );
}

function DashboardMetric({
  label,
  value,
  description,
  href,
  tone = "slate",
}: DashboardMetricProps) {
  return (
    <Link
      href={href}
      className={[
        "group block rounded-[1.75rem] border p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl",
        toneClasses[tone],
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-black uppercase tracking-[0.16em] opacity-70">
          {label}
        </p>
        <span
          className={[
            "mt-1 h-3 w-3 rounded-full shadow-sm transition group-hover:scale-125",
            dotClasses[tone],
          ].join(" ")}
        />
      </div>
      <p className="mt-6 text-5xl font-black tracking-tight">{value}</p>
      <p className="mt-3 text-sm leading-6 opacity-75">{description}</p>
    </Link>
  );
}

function WebsiteStyleSection({
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
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
        ) : null}
      </div>
      <div className="mt-7">{children}</div>
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
    <WebsiteStyleSection title={title} description={description}>
      <div className="space-y-4">
        {items.length ? (
          items.map((item) => {
            const card = (
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-md">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.subtitle}
                    </p>
                  </div>
                  {item.status ? <StatusPill status={item.status} /> : null}
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href} className="block">
                {card}
              </Link>
            ) : (
              <div key={item.id}>{card}</div>
            );
          })
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="font-semibold text-slate-500">{emptyMessage}</p>
          </div>
        )}
      </div>
    </WebsiteStyleSection>
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
    <Link
      href={href}
      className="group block rounded-[1.5rem] border border-white/15 bg-white/10 p-6 text-white shadow-sm transition duration-200 hover:-translate-y-1 hover:bg-white hover:text-slate-950 hover:shadow-xl"
    >
      <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-200 group-hover:text-blue-700">
        Next Move
      </p>
      <h3 className="mt-3 text-xl font-black">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300 group-hover:text-slate-600">
        {description}
      </p>
      <p className="mt-5 text-sm font-black">{cta} →</p>
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
        "Approve, reject, or revise the assets VIP generated before anything goes external.",
      href: "/approvals",
      cta: "Open approvals",
    });
  }

  if (input.failedToolRuns > 0) {
    actions.push({
      title: "Resolve failed actions",
      description:
        "Review failed executions so Gmail drafts, Facebook posts, or workflows do not stall.",
      href: "/actions",
      cta: "Review actions",
    });
  }

  if (input.activeGalaxyRuns > 0) {
    actions.push({
      title: "Check GalaxyAI outputs",
      description:
        "Pull completed creative workflow results back into VIP as usable campaign assets.",
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
    supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("generated_assets")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["needs_review", "revision_requested"])
      .order("created_at", { ascending: false })
      .limit(8),

    supabase
      .from("generated_assets")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(8),

    supabase
      .from("generated_assets")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(8),

    supabase
      .from("galaxyai_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),

    supabase
      .from("tool_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12),

    supabase
      .from("activity_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("prospects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(25),

    supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(25),
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
    subtitle: `${campaign.buyer_segment ?? "No buyer segment"} • ${formatDate(
      campaign.created_at
    )}`,
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
    <main className="mx-auto max-w-[1500px] space-y-10 px-5 py-6 md:px-8 md:py-10">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-[#07111f] text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.32),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(245,158,11,0.30),transparent_26%),linear-gradient(135deg,#07111f_0%,#0f2b46_55%,#113b5f_100%)]" />
        <div className="absolute right-8 top-8 hidden h-44 w-44 rounded-full border border-white/10 md:block" />
        <div className="absolute bottom-10 right-28 hidden h-20 w-20 rounded-full bg-amber-400/20 blur-xl md:block" />

        <div className="relative grid gap-10 p-7 md:p-10 xl:grid-cols-[1.1fr_0.9fr] xl:p-14">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">
              Web Search Pros style command center
            </p>
            <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
              Revolutionize your digital presence from one operating dashboard.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
              VIP turns Rudy's campaign strategy, AI workflows, approval gates,
              publishing actions, and revenue pipeline into one guided workspace
              for small-business marketing growth.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/campaigns"
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Create Campaign
              </Link>
              <Link
                href="/approvals"
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                Review Assets
              </Link>
              <Link
                href="/prospects"
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                Build Pipeline
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">
              Operating Status
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-slate-300">Pending review</p>
                <p className="mt-2 text-4xl font-black">{pendingAssets.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-slate-300">Completed actions</p>
                <p className="mt-2 text-4xl font-black">{completedToolRuns.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-slate-300">Prospects</p>
                <p className="mt-2 text-4xl font-black">{prospects.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-slate-300">Open deals</p>
                <p className="mt-2 text-4xl font-black">{openOpportunities.length}</p>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-white p-5 text-slate-950">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">
                Mission
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Expand reach, amplify brand story, and create authentic
                connections between businesses and their audiences.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <DashboardMetric
          label="Campaigns"
          value={campaigns.length}
          description="Revenue-focused campaigns in motion."
          href="/campaigns"
          tone="blue"
        />
        <DashboardMetric
          label="Pending Review"
          value={pendingAssets.length}
          description="Assets waiting for approval or revision."
          href="/approvals"
          tone="gold"
        />
        <DashboardMetric
          label="Approved"
          value={approvedAssets.length}
          description="Ready for safe execution."
          href="/zapier"
          tone="green"
        />
        <DashboardMetric
          label="Published"
          value={publishedAssets.length}
          description="Completed public publishing actions."
          href="/actions"
          tone="purple"
        />
        <DashboardMetric
          label="Failed"
          value={failedToolRuns.length}
          description="Actions that need attention."
          href="/actions"
          tone={failedToolRuns.length ? "gold" : "slate"}
        />
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <WebsiteStyleSection
          eyebrow="Our Digital Marketing Services"
          title="VIP is organized around the same services Rudy sells."
          description="The dashboard should feel like an internal extension of Web Search Pros: strategy, AI, content, automation, visibility, and revenue."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-700 text-lg font-black text-white shadow-md transition group-hover:bg-amber-500">
                  {service.title.slice(0, 1)}
                </div>
                <h3 className="mt-5 text-xl font-black text-slate-950">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {service.description}
                </p>
              </Link>
            ))}
          </div>
        </WebsiteStyleSection>

        <section className="relative overflow-hidden rounded-[2rem] bg-[#0b1f33] p-6 text-white shadow-xl md:p-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-8 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">
              Recommended Next Actions
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Keep the marketing engine moving.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              VIP is prioritizing work that keeps campaigns, approvals,
              external actions, and revenue follow-up from getting stuck.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {nextActions.map((action) => (
                <NextActionCard key={action.title} {...action} />
              ))}
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
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

      <section className="grid gap-8 xl:grid-cols-2">
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

      {campaigns.length === 0 && pendingAssets.length === 0 && toolRuns.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
            Start Here
          </p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">
            VIP is ready for your first Web Search Pros style workflow.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Create a campaign, generate assets, review them, and execute
            approved actions with safety gates.
          </p>
          <Link
            href="/campaigns"
            className="mt-7 inline-flex rounded-2xl bg-blue-700 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl"
          >
            Create Campaign
          </Link>
        </section>
      ) : null}
    </main>
  );
}
