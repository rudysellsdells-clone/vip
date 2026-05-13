import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GenerateAssetPackButton } from "@/components/campaigns/GenerateAssetPackButton";
import { AssetReviewActions } from "@/components/approvals/AssetReviewActions";

type PageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

function formatAssetType(type: string) {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusBadgeClass(status: string) {
  if (status === "approved") return "bg-emerald-100 text-emerald-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  if (status === "revision_requested") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-800";
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { campaignId } = await params;
  const supabase = await createClient();
  const db = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: campaign } = await db
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (!campaign) {
    redirect("/dashboard");
  }

  const { data: assets } = await db
    .from("generated_assets")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const pendingCount = (assets ?? []).filter((asset: any) =>
    ["needs_review", "revision_requested"].includes(asset.status)
  ).length;

  const approvedCount = (assets ?? []).filter((asset: any) => asset.status === "approved").length;

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">Campaign</p>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <p className="mt-2 text-slate-600">{campaign.idea}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Buyer Segment</p>
          <p className="mt-2 font-semibold">{campaign.buyer_segment}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Goal</p>
          <p className="mt-2 font-semibold">{campaign.goal}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending Review</p>
          <p className="mt-2 text-2xl font-bold">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="mt-2 text-2xl font-bold">{approvedCount}</p>
        </div>
      </section>

      <GenerateAssetPackButton campaignId={campaign.id} hasAssets={Boolean(assets?.length)} />

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Generated Assets</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review each draft. Approved assets can later move into GalaxyAI or Zapier workflows.
            </p>
          </div>
          <Link
            href="/approvals"
            className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Open Approval Queue
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {assets?.length ? (
            assets.map((asset: any) => {
              const revisionNotes =
                asset.metadata && typeof asset.metadata === "object"
                  ? asset.metadata.revisionNotes
                  : null;

              return (
                <article key={asset.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">{formatAssetType(asset.asset_type)}</p>
                      <h3 className="font-semibold">{asset.title}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(asset.status)}`}>
                      {asset.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  {revisionNotes && (
                    <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-semibold">Revision notes</p>
                      <p className="mt-1">{revisionNotes}</p>
                    </div>
                  )}

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {asset.content}
                  </p>

                  <AssetReviewActions assetId={asset.id} status={asset.status} />
                </article>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">
              No assets generated yet. Click Generate Asset Pack to create the first set of drafts.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
