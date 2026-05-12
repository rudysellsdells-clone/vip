import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

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
    .eq("campaign_id", campaign.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">Campaign</p>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <p className="mt-2 text-slate-600">{campaign.idea}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-5">
          <p className="text-sm text-slate-500">Buyer Segment</p>
          <p className="mt-2 font-semibold">{campaign.buyer_segment}</p>
        </div>
        <div className="rounded-2xl border p-5">
          <p className="text-sm text-slate-500">Goal</p>
          <p className="mt-2 font-semibold">{campaign.goal}</p>
        </div>
        <div className="rounded-2xl border p-5">
          <p className="text-sm text-slate-500">Status</p>
          <p className="mt-2 font-semibold">{campaign.status}</p>
        </div>
      </section>

      <section className="rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Generated Assets</h2>
        <div className="mt-4 space-y-4">
          {assets?.length ? (
            assets.map((asset) => (
              <article key={asset.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{asset.asset_type}</p>
                    <h3 className="font-semibold">{asset.title}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                    {asset.status}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                  {asset.content}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No assets generated yet. Sprint 2 will activate generation.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
