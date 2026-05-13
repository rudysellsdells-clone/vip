import { redirect } from "next/navigation";
import { AssetReviewActions } from "@/components/approvals/AssetReviewActions";
import { GenerateAssetPackButton } from "@/components/campaigns/GenerateAssetPackButton";
import { RunGalaxyAiAssetButton } from "@/components/galaxyai/RunGalaxyAiAssetButton";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { campaignId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (!campaign) {
    redirect("/dashboard");
  }

  const { data: assets } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const { data: workflows } = await supabase
    .from("galaxyai_workflows")
    .select("galaxy_workflow_id,name")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("name", { ascending: true });

  const { data: runs } = await supabase
    .from("galaxyai_runs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <section className="rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Campaign</p>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="mt-2 max-w-3xl text-slate-600">{campaign.idea}</p>
          </div>
          <GenerateAssetPackButton campaignId={campaign.id} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-5 shadow-sm">
          <p className="text-sm text-slate-500">Buyer Segment</p>
          <p className="mt-2 font-semibold">{campaign.buyer_segment}</p>
        </div>
        <div className="rounded-2xl border p-5 shadow-sm">
          <p className="text-sm text-slate-500">Goal</p>
          <p className="mt-2 font-semibold">{campaign.goal}</p>
        </div>
        <div className="rounded-2xl border p-5 shadow-sm">
          <p className="text-sm text-slate-500">Status</p>
          <p className="mt-2 font-semibold">{campaign.status}</p>
        </div>
      </section>

      {campaign.strategy && formatJson(campaign.strategy) !== "{}" && (
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Campaign Strategy</h2>
          <pre className="mt-4 overflow-auto rounded-xl bg-slate-950 p-4 text-sm text-white">
            {formatJson(campaign.strategy)}
          </pre>
        </section>
      )}

      <section className="rounded-2xl border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Generated Assets</h2>
        <div className="mt-4 space-y-4">
          {assets?.length ? (
            assets.map((asset) => (
              <article key={asset.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        {asset.asset_type}
                      </p>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                        {asset.status}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{asset.title}</h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {asset.content}
                    </p>
                  </div>

                  <div className="w-full space-y-3 lg:w-80">
                    <AssetReviewActions assetId={asset.id} />
                    {asset.asset_type === "galaxyai_prompt" && asset.status === "approved" && (
                      <RunGalaxyAiAssetButton
                        assetId={asset.id}
                        campaignId={campaign.id}
                        workflows={workflows ?? []}
                      />
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No assets generated yet. Click Generate Asset Pack.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">GalaxyAI Runs for This Campaign</h2>
        <div className="mt-4 space-y-3">
          {runs?.length ? (
            runs.map((run) => (
              <article key={run.id} className="rounded-xl border p-4">
                <p className="font-semibold">Run {run.galaxy_run_id}</p>
                <p className="mt-1 text-sm text-slate-500">Status: {run.status}</p>
                {run.error && <p className="mt-1 text-sm text-red-600">{run.error}</p>}
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No GalaxyAI runs yet. Approve a GalaxyAI prompt and run it.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
