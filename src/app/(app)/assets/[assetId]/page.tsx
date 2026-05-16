import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssetReviewActions } from "@/components/approvals/AssetReviewActions";
import { RequestRevisionButton } from "@/components/assets/RequestRevisionButton";

type PageProps = {
  params: Promise<{
    assetId: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { assetId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: asset, error: assetError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .single();

  if (assetError || !asset) {
    redirect("/approvals");
  }

  const { data: campaign } = asset.campaign_id
    ? await supabase
        .from("campaigns")
        .select("*")
        .eq("id", asset.campaign_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: childRevisions } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("parent_asset_id", asset.id)
    .order("version", { ascending: false });

  const { data: parentAsset } = asset.parent_asset_id
    ? await supabase
        .from("generated_assets")
        .select("*")
        .eq("id", asset.parent_asset_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: approvals } = await supabase
    .from("approvals")
    .select("*")
    .eq("user_id", user.id)
    .eq("asset_id", asset.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const canRevise = asset.status !== "published" && asset.status !== "sent";

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/approvals" className="text-sm font-semibold text-slate-600">
            ← Back to approvals
          </Link>
          <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">
            {asset.asset_type} • Version {asset.version}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{asset.title ?? "Untitled asset"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Status: {formatStatus(asset.status)} • Created {formatDate(asset.created_at)}
          </p>
          {campaign ? (
            <p className="mt-1 text-sm text-slate-500">
              Campaign: <Link className="font-semibold" href={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <AssetReviewActions assetId={asset.id} />
          {canRevise ? (
            <RequestRevisionButton assetId={asset.id} assetTitle={asset.title} />
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Asset Content</h2>
        <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-800">
          {asset.content}
        </pre>
      </section>

      {parentAsset ? (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Parent Asset</h2>
          <Link href={`/assets/${parentAsset.id}`} className="mt-3 block rounded-xl border p-4 hover:bg-slate-50">
            <p className="font-semibold">{parentAsset.title ?? "Untitled parent asset"}</p>
            <p className="mt-1 text-sm text-slate-500">
              Version {parentAsset.version} • {formatStatus(parentAsset.status)}
            </p>
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Revision History</h2>
        <div className="mt-4 space-y-3">
          {childRevisions?.length ? (
            childRevisions.map((revision) => (
              <Link
                key={revision.id}
                href={`/assets/${revision.id}`}
                className="block rounded-xl border p-4 hover:bg-slate-50"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">{revision.title ?? "Untitled revision"}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Version {revision.version} • {formatStatus(revision.status)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(revision.created_at)}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
              No child revisions yet.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Approval Activity</h2>
        <div className="mt-4 space-y-3">
          {approvals?.length ? (
            approvals.map((approval) => (
              <article key={approval.id} className="rounded-xl border p-4">
                <p className="font-semibold">{formatStatus(approval.status)}</p>
                {approval.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{approval.notes}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">{formatDate(approval.created_at)}</p>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
              No approval records yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
