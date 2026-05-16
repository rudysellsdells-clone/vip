import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type StatusCardProps = {
  label: string;
  value: number | string;
  description: string;
  href: string;
};

type RecentItem = {
  id: string;
  title: string;
  subtitle: string;
  href?: string;
  status?: string;
};

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(status: string | null) {
  if (!status) return "Unknown";

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function StatusCard({ label, value, description, href }: StatusCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </Link>
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
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((item) => {
            const content = (
              <div className="rounded-xl border p-4 transition hover:bg-slate-50">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
                  </div>

                  {item.status ? (
                    <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                      {formatStatus(item.status)}
                    </span>
                  ) : null}
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          </div>
        )}
      </div>
    </section>
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
      className="block rounded-xl border bg-white p-4 shadow-sm transition hover:bg-slate-50"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <p className="mt-3 text-sm font-semibold text-slate-950">{cta} →</p>
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

  if (input.pendingAssets > 0) {
    actions.push({
      title: "Review pending assets",
      description:
        "Approve, reject, or request revisions before VIP can run external actions.",
      href: "/approvals",
      cta: "Open approvals",
    });
  }

  if (input.failedToolRuns > 0) {
    actions.push({
      title: "Fix failed executions",
      description:
        "Review failed Zapier or tool actions so revenue workflows do not stall.",
      href: "/actions",
      cta: "Review actions",
    });
  }

  if (input.activeGalaxyRuns > 0) {
    actions.push({
      title: "Check GalaxyAI runs",
      description:
        "Pull completed creative outputs back into VIP as campaign assets.",
      href: "/galaxyai",
      cta: "Check GalaxyAI",
    });
  }

  if (input.preparedActions > 0) {
    actions.push({
      title: "Execute prepared actions",
      description:
        "Create Gmail drafts or publish locked Facebook posts from approved assets.",
      href: "/zapier",
      cta: "Open Zapier actions",
    });
  }

  if (input.campaigns === 0) {
    actions.push({
      title: "Create the first campaign",
      description:
        "Start with one revenue-focused campaign for a core buyer segment.",
      href: "/campaigns",
      cta: "Create campaign",
    });
  }

  actions.push({
    title: "Create another revenue campaign",
    description:
      "Generate a fresh campaign for AIO, SEO, Web Development, or Content Creation.",
    href: "/campaigns",
    cta: "Start campaign",
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
  ]);

  const campaigns = campaignsResult.data ?? [];
  const pendingAssets = pendingAssetsResult.data ?? [];
  const approvedAssets = approvedAssetsResult.data ?? [];
  const publishedAssets = publishedAssetsResult.data ?? [];
  const galaxyRuns = galaxyRunsResult.data ?? [];
  const toolRuns = toolRunsResult.data ?? [];
  const activities = activityResult.data ?? [];

  const activeGalaxyRuns = galaxyRuns.filter((run) =>
    ["queued", "running"].includes(run.status)
  );
  const failedToolRuns = toolRuns.filter((run) => run.status === "failed");
  const preparedToolRuns = toolRuns.filter((run) =>
    ["planned", "waiting_approval", "failed"].includes(run.status)
  );
  const completedToolRuns = toolRuns.filter((run) => run.status === "completed");

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
    title: asset.title ?? `${formatStatus(asset.asset_type)} asset`,
    subtitle: `${asset.asset_type} • ${formatDate(asset.created_at)}`,
    href: "/approvals",
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
    status: null,
  }));

  return (
    <main className="mx-auto max-w-7xl space-y-10 p-8">
      <section className="rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Rudy&apos;s VIP
        </p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-950">
              Command Center
            </h1>
            <p className="mt-3 max-w-3xl text-slate-600">
              Track campaigns, approvals, GalaxyAI work, Zapier executions, and the
              next best revenue actions from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/campaigns"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              New Campaign
            </Link>
            <Link
              href="/approvals"
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Review Assets
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatusCard
          label="Pending Review"
          value={pendingAssets.length}
          description="Assets waiting for approval or revision."
          href="/approvals"
        />
        <StatusCard
          label="Approved Assets"
          value={approvedAssets.length}
          description="Ready for Zapier or GalaxyAI action."
          href="/zapier"
        />
        <StatusCard
          label="Published Assets"
          value={publishedAssets.length}
          description="Completed public publishing actions."
          href="/actions"
        />
        <StatusCard
          label="Active GalaxyAI"
          value={activeGalaxyRuns.length}
          description="Queued or running creative workflows."
          href="/galaxyai"
        />
        <StatusCard
          label="Failed Actions"
          value={failedToolRuns.length}
          description="Tool runs that need attention."
          href="/actions"
        />
      </section>

      <section className="rounded-2xl border bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recommended Next Actions</h2>
            <p className="mt-1 text-sm text-slate-300">
              VIP is prioritizing the work most likely to keep campaigns moving.
            </p>
          </div>
          <p className="text-sm text-slate-300">
            {completedToolRuns.length} completed action(s) in recent history
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {nextActions.map((action) => (
            <NextActionCard key={action.title} {...action} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RecentList
          title="Recent Campaigns"
          description="Newest campaigns in Rudy's Marketing Twin."
          items={recentCampaignItems}
          emptyMessage="No campaigns yet. Create one to begin."
        />

        <RecentList
          title="Pending Assets"
          description="Assets that still need a decision."
          items={pendingAssetItems}
          emptyMessage="No pending assets right now."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RecentList
          title="Recent Executions"
          description="Latest Zapier and tool actions."
          items={toolRunItems}
          emptyMessage="No tool runs yet."
        />

        <RecentList
          title="Recent Activity"
          description="Latest app activity and system events."
          items={activityItems}
          emptyMessage="No activity yet."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Link
          href="/galaxyai"
          className="rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <h3 className="font-semibold">GalaxyAI</h3>
          <p className="mt-2 text-sm text-slate-600">
            Sync workflows, check runs, and retrieve generated assets.
          </p>
        </Link>

        <Link
          href="/zapier"
          className="rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <h3 className="font-semibold">Zapier Actions</h3>
          <p className="mt-2 text-sm text-slate-600">
            Prepare and execute approved business actions.
          </p>
        </Link>

        <Link
          href="/actions"
          className="rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <h3 className="font-semibold">Action History</h3>
          <p className="mt-2 text-sm text-slate-600">
            Review completed, failed, and canceled executions.
          </p>
        </Link>

        <Link
          href="/campaigns"
          className="rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-slate-50"
        >
          <h3 className="font-semibold">Campaign Builder</h3>
          <p className="mt-2 text-sm text-slate-600">
            Create the next revenue-focused campaign.
          </p>
        </Link>
      </section>
    </main>
  );
}
