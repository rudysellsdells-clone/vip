import Link from "next/link";
import { redirect } from "next/navigation";
import { ProspectForm } from "@/components/prospects/ProspectForm";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getActiveWorkspaceForUser } from "@/lib/accounts/active-workspace";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function ProspectsPage() {
  const supabase = untypedSupabase(await createClient());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

  if (!workspace) redirect("/accounts");

  const activeWorkspace = workspace!;

  const { data: prospectsData, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("account_id", activeWorkspace.activeAccountId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) console.error("Failed to load prospects", error);

  const prospects = (prospectsData ?? []) as Array<Record<string, any>>;
  const newCount = prospects.filter((prospect) => prospect.status === "new").length;
  const qualifiedCount = prospects.filter((prospect) => prospect.status === "qualified").length;
  const activeCount = prospects.filter((prospect) => prospect.status === "active_opportunity").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow={`Revenue Pipeline • ${activeWorkspace.activeAccountName}`}
        title="Track prospects worth pursuing."
        description="Keep your best-fit businesses organized inside the active workspace so campaigns can turn into conversations, opportunities, projects, and retainers."
        primaryAction={{ label: "View Opportunities", href: "/opportunities" }}
        secondaryAction={{ label: "Create Campaign", href: "/campaigns" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Total Prospects" value={prospects.length} description="Businesses in this workspace list." dot="blue" />
        <WebsiteMetric label="New" value={newCount} description="Added but not worked yet." dot="gold" />
        <WebsiteMetric label="Qualified" value={qualifiedCount} description="Good-fit potential buyers." dot="green" />
        <WebsiteMetric label="Active Opportunity" value={activeCount} description="Already connected to pipeline." href="/opportunities" dot="purple" />
      </section>

      <div className={websiteStyles.formFrame}>
        <ProspectForm />
      </div>

      <WebsiteSection
        eyebrow="Working List"
        title="Prospect list"
        description="Use this as the practical account-scoped list for targeting, outreach, and follow-up."
      >
        {prospects.length ? (
          <div className={websiteStyles.cardGrid}>
            {prospects.map((prospect) => (
              <article key={prospect.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>
                    {prospect.company_name ?? "Unnamed company"}
                  </h3>
                  <WebsiteBadge status={prospect.status} />
                </div>

                <p className={websiteStyles.cardMeta}>
                  {[prospect.contact_name, prospect.email, prospect.phone].filter(Boolean).join(" • ") || "No contact details yet"}
                </p>
                <p className={websiteStyles.cardMeta}>
                  {[prospect.industry, prospect.buyer_segment, prospect.source].filter(Boolean).join(" • ") || "No segment/source details yet"}
                </p>

                {prospect.notes ? (
                  <p className={websiteStyles.cardText}>{prospect.notes}</p>
                ) : null}

                <p className={websiteStyles.cardMeta}>Updated {formatDate(prospect.updated_at)}</p>
                {prospect.website ? (
                  <p>
                    <Link href={prospect.website} className={websiteStyles.link}>
                      {prospect.website}
                    </Link>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No prospects yet for this workspace. Add the first company you want to pursue.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
