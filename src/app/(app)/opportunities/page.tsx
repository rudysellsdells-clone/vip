import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OpportunityForm } from "@/components/opportunities/OpportunityForm";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";

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

  const opportunities = (opportunitiesResult.data ?? []) as Array<Record<string, any>>;
  const prospects: Option[] = ((prospectsResult.data ?? []) as Array<Record<string, any>>).map((prospect) => ({
    id: prospect.id,
    name: prospect.company_name ?? "Unnamed prospect",
  }));
  const serviceLines: Option[] = ((serviceLinesResult.data ?? []) as Array<Record<string, any>>).map((serviceLine) => ({ id: serviceLine.id, name: serviceLine.name }));
  const offers: Option[] = ((offersResult.data ?? []) as Array<Record<string, any>>).map((offer) => ({ id: offer.id, name: offer.name }));

  const openOpportunities = opportunities.filter((opportunity) => !["won", "lost", "paused"].includes(opportunity.stage));
  const wonOpportunities = opportunities.filter((opportunity) => opportunity.stage === "won");
  const totalOpenValue = openOpportunities.reduce((sum, opportunity) => sum + Number(opportunity.estimated_value ?? 0), 0);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Revenue Pipeline"
        title="Turn marketing activity into real opportunities."
        description="Track project, retainer, audit, and consulting opportunities that come from campaigns, prospecting, and follow-up."
        primaryAction={{ label: "Add Prospects", href: "/prospects" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Open Deals" value={openOpportunities.length} description="Active sales conversations." dot="blue" />
        <WebsiteMetric label="Open Value" value={formatCurrency(totalOpenValue)} description="Estimated pipeline value." dot="green" />
        <WebsiteMetric label="Won" value={wonOpportunities.length} description="Closed successful opportunities." dot="purple" />
        <WebsiteMetric label="Tracked" value={opportunities.length} description="All opportunities in VIP." dot="gold" />
      </section>

      <div className={websiteStyles.formFrame}>
        <OpportunityForm prospects={prospects} serviceLines={serviceLines} offers={offers} />
      </div>

      <WebsiteSection
        eyebrow="Deal Board"
        title="Opportunity pipeline"
        description="A simple visual pipeline before deeper CRM automation."
      >
        {opportunities.length ? (
          <div className={websiteStyles.cardGrid}>
            {opportunities.map((opportunity) => (
              <article key={opportunity.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>{opportunity.name}</h3>
                  <WebsiteBadge status={opportunity.stage} />
                </div>

                <p className={websiteStyles.cardMeta}>
                  {formatLabel(opportunity.opportunity_type)} • {formatCurrency(Number(opportunity.estimated_value ?? 0))}
                </p>

                {opportunity.next_step ? (
                  <p className={websiteStyles.cardText}>
                    <strong>Next step:</strong> {opportunity.next_step}
                  </p>
                ) : null}

                {opportunity.notes ? (
                  <p className={websiteStyles.cardText}>{opportunity.notes}</p>
                ) : null}

                <p className={websiteStyles.cardMeta}>Updated {formatDate(opportunity.updated_at)}</p>
                {opportunity.close_date ? (
                  <p className={websiteStyles.cardMeta}>Close date {formatDate(opportunity.close_date)}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No opportunities yet. Create the first opportunity when a prospect becomes a real sales conversation.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
