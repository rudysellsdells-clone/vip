import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssetReviewActions } from "@/components/approvals/AssetReviewActions";
import { RequestRevisionButton } from "@/components/assets/RequestRevisionButton";
import { VipEmptyState, VipMetricCard } from "@/components/vip-ui/VipCards";
import { VipHero, VipPageShell } from "@/components/vip-ui/VipPageShell";
import { VipSection } from "@/components/vip-ui/VipCards";
import { VipStatusBadge } from "@/components/vip-ui/VipStatusBadge";
import { VipWorkflowRail } from "@/components/vip-ui/VipWorkflow";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assetsData, error } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["needs_review", "revision_requested"])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) console.error("Failed to load approval assets", error);

  const assets = (assetsData ?? []) as any[];
  const needsReviewCount = assets.filter((asset) => asset.status === "needs_review").length;
  const revisionCount = assets.filter((asset) => asset.status === "revision_requested").length;

  const campaignIds = Array.from(new Set(assets.map((asset) => asset.campaign_id).filter(Boolean))) as string[];
  let campaignNameById = new Map<string, string>();

  if (campaignIds.length > 0) {
    const { data: campaignsData } = await supabase
      .from("campaigns")
      .select("id,name")
      .eq("user_id", user.id)
      .in("id", campaignIds);

    campaignNameById = new Map(((campaignsData ?? []) as any[]).map((campaign) => [campaign.id, campaign.name]));
  }

  return (
    <VipPageShell>
      <VipHero
        eyebrow="Approval Queue"
        title="Review, revise, then approve"
        description="This is the safety layer. Every asset should earn approval before VIP can send, publish, or execute anything externally."
        primaryAction={{ label: "Create Campaign", href: "/campaigns" }}
        secondaryAction={{ label: "View Actions", href: "/actions" }}
      >
        <VipWorkflowRail
          steps={[
            { label: "Read", description: "Scan the asset and campaign context.", state: "active" },
            { label: "Revise", description: "Request a focused update when the first draft is close.", state: revisionCount > 0 ? "active" : "idle" },
            { label: "Approve", description: "Approve only the version you are comfortable executing.", state: "idle" },
            { label: "Execute", description: "Move approved assets to GalaxyAI, Gmail, Facebook, or Zapier.", state: "idle" },
          ]}
        />
      </VipHero>

      <section className="grid gap-4 md:grid-cols-3">
        <VipMetricCard label="Needs Review" value={needsReviewCount} description="Fresh assets waiting for a decision." tone="warning" />
        <VipMetricCard label="Revision Requested" value={revisionCount} description="Original versions that have a revision path." tone="purple" />
        <VipMetricCard label="Total Queue" value={assets.length} description="All visible assets needing attention." tone="info" />
      </section>

      <VipSection title="Assets waiting for your decision" description="Approve, reject, or create a revised version using Rudy's clone memory.">
        {assets.length ? (
          <div className="space-y-5">
            {assets.map((asset) => {
              const campaignName = asset.campaign_id
                ? campaignNameById.get(asset.campaign_id) ?? "Campaign unavailable"
                : "No campaign";

              return (
                <article key={asset.id} className="vip-card-hover rounded-[1.75rem] border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <VipStatusBadge status={asset.status} />
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-600">
                          Version {asset.version}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold text-slate-600">
                          {asset.asset_type}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                        {asset.title ?? "Untitled asset"}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {campaignName} • Updated {formatDate(asset.updated_at)}
                      </p>

                      <pre className="vip-subtle-scrollbar mt-5 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                        {asset.content}
                      </pre>

                      <Link href={`/assets/${asset.id}`} className="mt-4 inline-flex text-sm font-black text-sky-700 hover:text-sky-900">
                        View details and revision history →
                      </Link>
                    </div>

                    <div className="flex w-full flex-col gap-3 xl:w-96">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Decision Panel
                        </p>
                        <div className="mt-3">
                          <AssetReviewActions assetId={asset.id} />
                        </div>
                      </div>
                      <RequestRevisionButton assetId={asset.id} assetTitle={asset.title} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <VipEmptyState
            title="Nothing needs review right now"
            description="Generate a campaign asset pack and new assets will appear here for approval, rejection, or revision."
            action={{ label: "Create Campaign", href: "/campaigns" }}
          />
        )}
      </VipSection>
    </VipPageShell>
  );
}
