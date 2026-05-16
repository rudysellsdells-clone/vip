import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssetReviewActions } from "@/components/approvals/AssetReviewActions";
import { RequestRevisionButton } from "@/components/assets/RequestRevisionButton";

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

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: assets, error } = await supabase
    .from("generated_assets")
    .select("*, campaigns(name)")
    .eq("user_id", user.id)
    .in("status", ["needs_review", "revision_requested"])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to load approval assets", error);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Sprint 5.8
        </p>
        <h1 className="text-3xl font-bold">Approval Queue</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Review generated assets, approve them for execution, or create a revised version using Rudy&apos;s clone memory.
        </p>
      </section>

      <section className="space-y-4">
        {assets?.length ? (
          assets.map((asset) => {
            const campaignName =
              asset.campaigns && typeof asset.campaigns === "object" && "name" in asset.campaigns
                ? String(asset.campaigns.name)
                : "No campaign";

            const canRevise = asset.status !== "published" && asset.status !== "sent";

            return (
              <article key={asset.id} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {asset.asset_type}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        Version {asset.version}
                      </span>
                      <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-medium text-white">
                        {formatStatus(asset.status)}
                      </span>
                    </div>

                    <h2 className="mt-2 text-xl font-semibold">
                      {asset.title ?? "Untitled asset"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {campaignName} • Updated {formatDate(asset.updated_at)}
                    </p>

                    <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                      {asset.content}
                    </pre>

                    <div className="mt-4">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="text-sm font-semibold text-slate-950 underline"
                      >
                        View asset details and revision history
                      </Link>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-3 md:w-80">
                    <AssetReviewActions assetId={asset.id} />
                    {canRevise ? (
                      <RequestRevisionButton assetId={asset.id} assetTitle={asset.title} />
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
            <h2 className="text-lg font-semibold">No assets waiting for review</h2>
            <p className="mt-2 text-sm text-slate-500">
              Generate a campaign asset pack to review, approve, or revise assets.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
