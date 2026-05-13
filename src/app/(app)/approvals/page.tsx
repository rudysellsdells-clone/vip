import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssetReviewActions } from "@/components/approvals/AssetReviewActions";

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

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const db = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: assets } = await db
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["needs_review", "revision_requested"])
    .order("created_at", { ascending: false });

  const campaignIds = Array.from(
    new Set((assets ?? []).map((asset: any) => asset.campaign_id).filter(Boolean))
  );

  const { data: campaigns } = campaignIds.length
    ? await db.from("campaigns").select("id,name").eq("user_id", user.id).in("id", campaignIds)
    : { data: [] };

  const campaignNameById = new Map<string, string>(
    (campaigns ?? []).map((campaign: any) => [campaign.id, campaign.name])
  );

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">Approval Queue</p>
        <h1 className="text-3xl font-bold">Review generated assets</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Approve, reject, or request revisions before anything moves toward external tools like
          GalaxyAI, Gmail, LinkedIn, Facebook, YouTube, or Synthesia.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Needs Review</p>
          <p className="mt-2 text-3xl font-bold">
            {(assets ?? []).filter((asset: any) => asset.status === "needs_review").length}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Revision Requested</p>
          <p className="mt-2 text-3xl font-bold">
            {(assets ?? []).filter((asset: any) => asset.status === "revision_requested").length}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Pending</p>
          <p className="mt-2 text-3xl font-bold">{assets?.length ?? 0}</p>
        </div>
      </section>

      <section className="space-y-4">
        {assets?.length ? (
          assets.map((asset: any) => {
            const campaignName = asset.campaign_id
              ? campaignNameById.get(asset.campaign_id) ?? "Campaign"
              : "Campaign";

            const revisionNotes =
              asset.metadata && typeof asset.metadata === "object"
                ? asset.metadata.revisionNotes
                : null;

            return (
              <article key={asset.id} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{formatAssetType(asset.asset_type)}</p>
                    <h2 className="mt-1 text-xl font-semibold">{asset.title}</h2>
                    <Link
                      href={`/campaigns/${asset.campaign_id}`}
                      className="mt-2 inline-block text-sm font-medium text-slate-700 underline underline-offset-4"
                    >
                      {campaignName}
                    </Link>
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

                <div className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {asset.content}
                </div>

                <AssetReviewActions assetId={asset.id} status={asset.status} />
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold">No assets need approval right now.</h2>
            <p className="mt-2 text-slate-600">
              Generate a Marketing Asset Pack from a campaign, and drafts will appear here.
            </p>
            <Link
              href="/campaigns"
              className="mt-5 inline-block rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Create or Open Campaigns
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
