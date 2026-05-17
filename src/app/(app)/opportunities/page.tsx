import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";
import { VipEmptyState, VipMetricCard, VipSection } from "@/components/vip-ui/VipCards";
import { VipHero, VipPageShell } from "@/components/vip-ui/VipPageShell";
import { VipStatusBadge } from "@/components/vip-ui/VipStatusBadge";

type Option = {
  id: string;
  name: string;
};

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatCurrency(value: number | null) {
  if (value === null) return "No value";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [opportunitiesResult, prospectsResult, serviceLinesResult, offersResult] = await Promise.all([
    supabase.from("opportunities").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100),
    supabase.from("prospects").select("id,company_name").eq("user_id", user.id).order("company_name", { ascending: true }),
    supabase.from("service_lines").select("id,name").eq("user_id", user.id).eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("offers").select("id,name").eq("user_id", user.id).eq("active", true).order("name", { ascending: true }),
  ]);

  if (opportunitiesResult.error) console.error("Failed to load opportunities", opportunitiesResult.error);

  const opportunities = (opportunitiesResult.data ?? []) as any[];
  const prospects: Option[] = ((prospectsResult.data ?? []) as any[]).map((prospect) => ({
    id: prospect.id,
    name: prospect.company_name ?? "Unnamed prospect",
  }));
  const serviceLines: Option[] = ((serviceLinesResult.data ?? []) as any[]).map((serviceLine) => ({ id: serviceLine.id, name: serviceLine.name }));
  const offers: Option[] = ((offersResult.data ?? []) as any[]).map((offer) => ({ id: offer.id, name: offer.name }));

  const openOpportunities = opportunities.filter((opportunity) => !["won", "lost", "paused"].includes(opportunity.stage));
  const wonOpportunities = opportunities.filter((opportunity) => opportunity.stage === "won");
  const totalOpenValue = openOpportunities.reduce((sum, opportunity) => sum + Number(opportunity.estimated_value ?? 0), 0);

  return (
    <VipPageShell>
      <VipHero
        eyebrow="Revenue Pipeline"
        title="Opportunities and pipeline"
        description="Track project, retainer, audit, and consulting opportunities that come from campaigns, prospecting, and follow-up."
        primaryAction={{ label: "Add Prospects", href: "/prospects" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <VipMetricCard label="Open Deals" value={openOpportunities.length} description="Active sales conversations." tone="info" />
        <VipMetricCard label="Open Value" value={formatCurrency(totalOpenValue)} description="Estimated pipeline value." tone="success" />
        <VipMetricCard label="Won" value={wonOpportunities.length} description="Closed successful opportunities." tone="purple" />
        <VipMetricCard label="Tracked" value={opportunities.length} description="All opportunities in VIP." />
      </section>

      <div className="vip-card rounded-[1.75rem] p-1">
        <OpportunityForm prospects={prospects} serviceLines={serviceLines} offers={offers} />
      </div>

      <VipSection title="Pipeline board" description="A clean deal board before we add deeper CRM automation.">
        {opportunities.length ? (
          <div className="space-y-4">
            {opportunities.map((opportunity) => (
              <article key={opportunity.id} className="vip-card-hover rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">{opportunity.name}</h3>
                      <VipStatusBadge status={opportunity.stage} size="xs" />
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      {formatLabel(opportunity.opportunity_type)} • {formatCurrency(Number(opportunity.estimated_value ?? 0))}
                    </p>
                    {opportunity.next_step ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                        Next step: {opportunity.next_step}
                      </p>
                    ) : null}
                    {opportunity.notes ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{opportunity.notes}</p>
                    ) : null}
                  </div>

                  <div className="text-sm text-slate-500 md:text-right">
                    <p>Updated {formatDate(opportunity.updated_at)}</p>
                    {opportunity.close_date ? <p className="mt-1">Close date {formatDate(opportunity.close_date)}</p> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <VipEmptyState
            title="No opportunities yet"
            description="Create the first opportunity when a prospect becomes a real sales conversation."
            action={{ label: "Add Prospect", href: "/prospects" }}
          />
        )}
      </VipSection>
    </VipPageShell>
  );
}
