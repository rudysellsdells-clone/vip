import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignForm } from "@/components/campaigns/CampaignForm";

function formatStatus(status: string | null) {
  if (!status) return "Draft";

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CampaignsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load campaigns", error);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-10 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Campaigns
        </p>
        <h1 className="text-3xl font-bold">Campaign Library</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Review existing campaigns or create a new campaign for Rudy’s Marketing Twin.
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Existing Campaigns</h2>
            <p className="mt-1 text-sm text-slate-500">
              Open a campaign to review, generate assets, approve content, or run next steps.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            {campaigns?.length ?? 0} total
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {campaigns?.length ? (
            campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="block rounded-xl border p-4 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {campaign.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {campaign.idea}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {campaign.buyer_segment ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {campaign.buyer_segment}
                        </span>
                      ) : null}

                      {campaign.goal ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          Goal: {campaign.goal}
                        </span>
                      ) : null}

                      {campaign.cta ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          CTA: {campaign.cta}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-row gap-2 md:flex-col md:items-end">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                      {formatStatus(campaign.status)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(campaign.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <h3 className="font-semibold">No campaigns yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Create your first campaign below. After it saves, it will appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Create New Campaign</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use this form to create a new revenue-focused campaign.
          </p>
        </div>

        <CampaignForm />
      </section>
    </main>
  );
}
