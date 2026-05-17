import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProspectForm } from "@/components/prospects/ProspectForm";
import { VipEmptyState, VipMetricCard, VipSection } from "@/components/vip-ui/VipCards";
import { VipHero, VipPageShell } from "@/components/vip-ui/VipPageShell";
import { VipStatusBadge } from "@/components/vip-ui/VipStatusBadge";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function ProspectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: prospectsData, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) console.error("Failed to load prospects", error);

  const prospects = (prospectsData ?? []) as any[];
  const newCount = prospects.filter((prospect) => prospect.status === "new").length;
  const qualifiedCount = prospects.filter((prospect) => prospect.status === "qualified").length;
  const activeCount = prospects.filter((prospect) => prospect.status === "active_opportunity").length;

  return (
    <VipPageShell>
      <VipHero
        eyebrow="Revenue Pipeline"
        title="Prospects worth pursuing"
        description="Track the companies and contacts your campaigns are meant to turn into sales conversations, projects, and retainers."
        primaryAction={{ label: "View Opportunities", href: "/opportunities" }}
        secondaryAction={{ label: "Create Campaign", href: "/campaigns" }}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <VipMetricCard label="Total Prospects" value={prospects.length} description="Businesses in your working list." tone="info" />
        <VipMetricCard label="New" value={newCount} description="Added but not worked yet." tone="warning" />
        <VipMetricCard label="Qualified" value={qualifiedCount} description="Good-fit potential buyers." tone="success" />
        <VipMetricCard label="Active Opportunity" value={activeCount} description="Already connected to pipeline." tone="purple" href="/opportunities" />
      </section>

      <div className="vip-card rounded-[1.75rem] p-1">
        <ProspectForm />
      </div>

      <VipSection title="Prospect list" description="Use this as the working list for campaign targeting and follow-up.">
        {prospects.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {prospects.map((prospect) => (
              <article key={prospect.id} className="vip-card-hover rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">
                        {prospect.company_name ?? "Unnamed company"}
                      </h3>
                      <VipStatusBadge status={prospect.status} size="xs" />
                    </div>

                    <p className="mt-2 text-sm font-medium text-slate-600">
                      {[prospect.contact_name, prospect.email, prospect.phone].filter(Boolean).join(" • ") || "No contact details yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[prospect.industry, prospect.buyer_segment, prospect.source].filter(Boolean).join(" • ") || "No segment/source details yet"}
                    </p>

                    {prospect.notes ? (
                      <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                        {prospect.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-sm text-slate-500 md:text-right">
                    <p>{formatDate(prospect.updated_at)}</p>
                    {prospect.website ? <p className="mt-1 break-all text-sky-700">{prospect.website}</p> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <VipEmptyState
            title="No prospects yet"
            description="Add the first company Rudy wants to pursue, then connect it to an opportunity when a real sales conversation starts."
            action={{ label: "View Opportunities", href: "/opportunities" }}
          />
        )}
      </VipSection>
    </VipPageShell>
  );
}
