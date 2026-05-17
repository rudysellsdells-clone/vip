import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VipActionCard } from "@/components/ui/vip/VipActionCard";
import { VipEmptyState } from "@/components/ui/vip/VipEmptyState";
import { VipMetricCard } from "@/components/ui/vip/VipMetricCard";
import { VipPageHeader } from "@/components/ui/vip/VipPageHeader";
import { VipSection } from "@/components/ui/vip/VipSection";
import { VipStatusBadge } from "@/components/ui/vip/VipStatusBadge";
import { VipWorkflowSteps } from "@/components/ui/vip/VipWorkflowSteps";

type RecentItem = {
  id: string;
  title: string;
  subtitle: string;
  href?: string;
  status?: string | null;
};

type CampaignRow = {
  id: string;
  name: string;
  buyer_segment: string | null;
  status: string;
  created_at: string | null;
};

type AssetRow = {
  id: string;
  title: string | null;
  asset_type: string;
  status: string;
  created_at: string | null;
};

type ToolRunRow = {
  id: string;
  provider: string;
  action_name: string;
  status: string;
  created_at: string | null;
};

type ActivityRow = {
  id: string;
  activity_type: string;
  title: string;
  created_at: string | null;
};

type GalaxyRunRow = {
  id: string;
  status: string;
};

type OpportunityRow = {
  id: string;
  stage: string;
  estimated_value: number | null;
};

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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
    <VipSection title={title} description={description}>
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => {
            const content = (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-black text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
                  </div>

                  {item.status ? <VipStatusBadge status={item.status} /> : null}
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
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          </div>
        )}
      </div>
    </VipSection>
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
      description: "Approve, reject, or revise campaign assets before execution.",
      href: "/approvals",
      cta: "Open approvals",
    });
  }

  if (input.failedToolRuns > 0) {
    actions.push({
      title: "Fix failed actions",
      description: "Review failed tool runs so campaign execution does not stall.",
      href: "/actions",
      cta: "Review actions",
    });
  }

  if (input.activeGalaxyRuns > 0) {
    actions.push({
      title: "Check GalaxyAI",
      description: "Pull completed creative outputs back into VIP.",
      href: "/galaxyai",
      cta: "Open GalaxyAI",
    });
  }

  if (input.preparedActions > 0) {
    actions.push({
      title: "Execute prepared actions",
      description: "Create Gmail drafts or publish locked Facebook posts.",
      href: "/zapier",
      cta: "Open Zapier",
    });
  }

  actions.push({
    title: "Build the pipeline",
    description: "Add prospects and opportunities so campaigns connect to revenue.",
    href: "/prospects",
    cta: "Open prospects",
  });

  if (input.campaigns === 0) {
    actions.unshift({
      title: "Create the first campaign",
      description: "Start with one focused service, buyer segment, and CTA.",
      href: "/campaigns",
      cta: "Create campaign",
    });
  }

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

  const campaigns = (campaignsResult.data ?? []) as CampaignRow[];
  const pendingAssets = (pendingAssetsResult.data ?? []) as AssetRow[];
  const approvedAssets = (approvedAssetsResult.data ?? []) as AssetRow[];
  const publishedAssets = (publishedAssetsResult.data ?? []) as AssetRow[];
  const galaxyRuns = (galaxyRunsResult.data ?? []) as GalaxyRunRow[];
  const toolRuns = (toolRunsResult.data ?? []) as ToolRunRow[];
  const activities = (activityResult.data ?? []) as ActivityRow[];
  const prospects = prospectsResult.data ?? [];
  const opportunities = (opportunitiesResult.data ?? []) as OpportunityRow[];

  const activeGalaxyRuns = galaxyRuns.filter((run) => ["queued", "running"].includes(run.status));
  const failedToolRuns = toolRuns.filter((run) => run.status === "failed");
  const preparedToolRuns = toolRuns.filter((run) => ["planned", "waiting_approval", "failed"].includes(run.status));
  const openOpportunities = opportunities.filter((opportunity) => !["won", "lost", "paused"].includes(opportunity.stage));

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
    <main className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <VipPageHeader
        eyebrow="Rudy's VIP"
        title="Marketing command center"
        description="A polished workspace for generating campaigns, reviewing assets, executing approved actions, and tracking revenue follow-up."
        primaryAction={{ label: "New Campaign", href: "/campaigns" }}
        secondaryAction={{ label: "Review Assets", href: "/approvals" }}
      >
        <VipWorkflowSteps
          steps={[
            { label: "Generate", description: "Create campaign assets using Rudy's clone memory.", complete: campaigns.length > 0 },
            { label: "Review", description: "Revise or approve only the strongest assets.", active: pendingAssets.length > 0 },
            { label: "Execute", description: "Run Gmail, Facebook, GalaxyAI, and Zapier safely.", complete: toolRuns.length > 0 },
            { label: "Track", description: "Connect campaigns to prospects and opportunities.", active: openOpportunities.length > 0 },
          ]}
        />
      </VipPageHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <VipMetricCard label="Pending Review" value={pendingAssets.length} description="Assets waiting for a decision." href="/approvals" tone="warning" />
        <VipMetricCard label="Approved Assets" value={approvedAssets.length} description="Ready for execution." href="/zapier" tone="success" />
        <VipMetricCard label="Published" value={publishedAssets.length} description="Public actions completed." href="/actions" tone="info" />
        <VipMetricCard label="Prospects" value={prospects.length} description="Revenue targets tracked." href="/prospects" tone="purple" />
        <VipMetricCard label="Open Deals" value={openOpportunities.length} description="Pipeline opportunities." href="/opportunities" tone="neutral" />
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Recommended next actions</h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              VIP is prioritizing work that keeps campaigns, execution, and revenue moving.
            </p>
          </div>
          <p className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200">
            {toolRuns.filter((run) => run.status === "completed").length} completed recently
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {nextActions.map((action) => (
            <VipActionCard key={action.title} {...action} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RecentList title="Recent campaigns" description="Newest campaign work in Rudy's Marketing Twin." items={recentCampaignItems} emptyMessage="No campaigns yet." />
        <RecentList title="Needs your attention" description="Assets that still need review or revision." items={pendingAssetItems} emptyMessage="No pending assets right now." />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RecentList title="Recent executions" description="Latest Zapier and tool actions." items={toolRunItems} emptyMessage="No tool runs yet." />
        <RecentList title="Recent activity" description="Latest app events and workflow updates." items={activityItems} emptyMessage="No activity yet." />
      </section>

      {campaigns.length === 0 && pendingAssets.length === 0 && toolRuns.length === 0 ? (
        <VipEmptyState
          title="VIP is ready for your first revenue workflow"
          description="Create a campaign, generate assets, review them, and execute approved actions with safety gates."
          action={{ label: "Create Campaign", href: "/campaigns" }}
        />
      ) : null}
    </main>
  );
}
