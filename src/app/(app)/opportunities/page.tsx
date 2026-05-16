import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";

type Option = {
  id: string;
  name: string;
};

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(value: number | null) {
  if (value === null) return "No value";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStatus(status: string | null) {
  if (!status) return "Unknown";

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function OpportunitiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    opportunitiesResult,
    prospectsResult,
    serviceLinesResult,
    offersResult,
  ] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100),

    supabase
      .from("prospects")
      .select("id,company_name")
      .eq("user_id", user.id)
      .order("company_name", { ascending: true }),

    supabase
      .from("service_lines")
      .select("id,name")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),

    supabase
      .from("offers")
      .select("id,name")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  if (opportunitiesResult.error) {
    console.error("Failed to load opportunities", opportunitiesResult.error);
  }

  const opportunities = opportunitiesResult.data ?? [];

  const prospects: Option[] = (prospectsResult.data ?? []).map((prospect) => ({
    id: prospect.id,
    name: prospect.company_name ?? "Unnamed prospect",
  }));

  const serviceLines: Option[] = serviceLinesResult.data ?? [];
  const offers: Option[] = offersResult.data ?? [];

  const openOpportunities = opportunities.filter((opportunity) =>
    !["won", "lost", "paused"].includes(opportunity.stage)
  );
  const wonOpportunities = opportunities.filter((opportunity) => opportunity.stage === "won");
  const totalOpenValue = openOpportunities.reduce((sum, opportunity) => {
    return sum + Number(opportunity.estimated_value ?? 0);
  }, 0);

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Sprint 6.0
        </p>
        <h1 className="text-3xl font-bold">Opportunities</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Track project, retainer, audit, and consulting opportunities that come from campaigns and prospecting.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Open Opportunities</p>
          <p className="mt-2 text-3xl font-bold">{openOpportunities.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Open Pipeline Value</p>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(totalOpenValue)}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Won</p>
          <p className="mt-2 text-3xl font-bold">{wonOpportunities.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Tracked</p>
          <p className="mt-2 text-3xl font-bold">{opportunities.length}</p>
        </div>
      </section>

      <OpportunityForm
        prospects={prospects}
        serviceLines={serviceLines}
        offers={offers}
      />

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Opportunity Pipeline</h2>
        <p className="mt-1 text-sm text-slate-500">
          Use this as a simple deal board before we add deeper CRM automation.
        </p>

        <div className="mt-5 space-y-3">
          {opportunities.length ? (
            opportunities.map((opportunity) => (
              <article key={opportunity.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{opportunity.name}</h3>
                      <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-medium text-white">
                        {formatStatus(opportunity.stage)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatStatus(opportunity.opportunity_type)} • {formatCurrency(Number(opportunity.estimated_value ?? 0))}
                    </p>
                    {opportunity.next_step ? (
                      <p className="mt-2 text-sm text-slate-700">
                        Next step: {opportunity.next_step}
                      </p>
                    ) : null}
                    {opportunity.notes ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                        {opportunity.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-sm text-slate-500 md:text-right">
                    <p>Updated {formatDate(opportunity.updated_at)}</p>
                    {opportunity.close_date ? (
                      <p className="mt-1">Close date {formatDate(opportunity.close_date)}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <h3 className="font-semibold">No opportunities yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Create the first opportunity when a prospect becomes a real sales conversation.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
