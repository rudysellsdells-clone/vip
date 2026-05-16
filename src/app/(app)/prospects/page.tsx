import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProspectForm } from "@/components/prospects/ProspectForm";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(status: string | null) {
  if (!status) return "Unknown";

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ProspectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: prospects, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to load prospects", error);
  }

  const prospectRows = prospects ?? [];

  const statusCounts = prospectRows.reduce<Record<string, number>>((acc, prospect) => {
    acc[prospect.status] = (acc[prospect.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Sprint 6.0
        </p>
        <h1 className="text-3xl font-bold">Prospects</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Track companies and contacts that campaigns can turn into project contracts or monthly retainers.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Prospects</p>
          <p className="mt-2 text-3xl font-bold">{prospectRows.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">New</p>
          <p className="mt-2 text-3xl font-bold">{statusCounts.new ?? 0}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Qualified</p>
          <p className="mt-2 text-3xl font-bold">{statusCounts.qualified ?? 0}</p>
        </div>
        <Link href="/opportunities" className="rounded-2xl border bg-white p-5 shadow-sm transition hover:bg-slate-50">
          <p className="text-sm text-slate-500">Pipeline</p>
          <p className="mt-2 text-lg font-semibold">View Opportunities →</p>
        </Link>
      </section>

      <ProspectForm />

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Prospect List</h2>
        <p className="mt-1 text-sm text-slate-500">
          Start simple: add qualified businesses, then create opportunities when there is a real sales conversation.
        </p>

        <div className="mt-5 space-y-3">
          {prospectRows.length ? (
            prospectRows.map((prospect) => (
              <article key={prospect.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{prospect.company_name ?? "Unnamed company"}</h3>
                      <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-medium text-white">
                        {formatStatus(prospect.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {[prospect.contact_name, prospect.email, prospect.phone]
                        .filter(Boolean)
                        .join(" • ") || "No contact details yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[prospect.industry, prospect.buyer_segment, prospect.source]
                        .filter(Boolean)
                        .join(" • ") || "No segment/source details yet"}
                    </p>
                    {prospect.notes ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{prospect.notes}</p>
                    ) : null}
                  </div>

                  <div className="text-sm text-slate-500 md:text-right">
                    <p>{formatDate(prospect.updated_at)}</p>
                    {prospect.website ? (
                      <p className="mt-1 break-all">{prospect.website}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <h3 className="font-semibold">No prospects yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Add the first business Rudy wants to pursue.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
