import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: pendingAssets } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "needs_review")
    .limit(5);

  return (
    <main className="space-y-8 p-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Sprint 1</p>
        <h1 className="mt-2 text-3xl font-bold">Rudys VIP Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Build and manage Rudy’s Marketing Twin.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Recent Campaigns</p>
          <p className="mt-2 text-3xl font-bold">{campaigns?.length ?? 0}</p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending Approvals</p>
          <p className="mt-2 text-3xl font-bold">{pendingAssets?.length ?? 0}</p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Current Goal</p>
          <p className="mt-2 text-lg font-bold">Save first campaign</p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Campaigns</h2>
            <p className="mt-1 text-sm text-slate-500">Revenue-focused campaigns for Rudy’s services.</p>
          </div>
          <Link
            href="/campaigns"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Create Campaign
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {campaigns?.length ? (
            campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="block rounded-xl border p-4 hover:bg-slate-50"
              >
                <p className="font-semibold">{campaign.name}</p>
                <p className="mt-1 text-sm text-slate-500">{campaign.status}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No campaigns yet. Create the first one to complete the Sprint 1 core flow.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
