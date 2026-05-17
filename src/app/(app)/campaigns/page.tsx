import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignWebsiteForm } from "@/components/campaigns/CampaignWebsiteForm";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [campaignsResult, serviceLinesResult, buyerSegmentsResult, offersResult] = await Promise.all([
    supabase.from("campaigns").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100),
    supabase.from("service_lines").select("id,name").eq("user_id", user.id).eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("buyer_segments").select("id,name").eq("user_id", user.id).eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("offers").select("id,name").eq("user_id", user.id).eq("active", true).order("name", { ascending: true }),
  ]);

  const campaigns = (campaignsResult.data ?? []) as Array<Record<string, any>>;
  const serviceLines = ((serviceLinesResult.data ?? []) as Array<Record<string, any>>).map((row) => ({ id: row.id, name: row.name }));
  const buyerSegments = ((buyerSegmentsResult.data ?? []) as Array<Record<string, any>>).map((row) => ({ id: row.id, name: row.name }));
  const offers = ((offersResult.data ?? []) as Array<Record<string, any>>).map((row) => ({ id: row.id, name: row.name }));

  const inReview = campaigns.filter((campaign) => ["asset_pack_generated", "in_review"].includes(campaign.status)).length;
  const active = campaigns.filter((campaign) => campaign.status === "active").length;
  const setupReady = serviceLines.length > 0 && buyerSegments.length > 0 && offers.length > 0;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Campaign Builder"
        title="Create revenue-focused marketing campaigns."
        description="Build campaigns around Rudy's services, buyer segments, offers, and calls-to-action. VIP will turn the brief into an asset pack for review."
        primaryAction={{ label: setupReady ? "Review Assets" : "Populate Dropdowns", href: setupReady ? "/approvals" : "/settings" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Campaigns" value={campaigns.length} description="Total campaigns in VIP." dot="blue" />
        <WebsiteMetric label="Buyer Segments" value={buyerSegments.length} description="Available targeting dropdowns." dot={buyerSegments.length ? "green" : "red"} href="/settings" />
        <WebsiteMetric label="Offers" value={offers.length} description="Available offer dropdowns." dot={offers.length ? "green" : "red"} href="/settings" />
        <WebsiteMetric label="In Review" value={inReview} description="Campaigns with generated assets." dot="gold" />
      </section>

      {!setupReady ? (
        <WebsiteSection
          eyebrow="Setup Needed"
          title="Populate buyer segments and offers first"
          description="The campaign form uses user-owned buyer segments and offers. Populate the commercial foundation once and the dropdowns will be ready."
        >
          <Link href="/settings" className={websiteStyles.link}>
            Go to Settings to populate dropdowns →
          </Link>
        </WebsiteSection>
      ) : null}

      <div className={websiteStyles.formFrame}>
        <CampaignWebsiteForm serviceLines={serviceLines} buyerSegments={buyerSegments} offers={offers} />
      </div>

      <WebsiteSection
        eyebrow="Campaign Library"
        title="Recent campaigns"
        description="Open a campaign to generate assets, review outputs, and move the work into approval."
      >
        {campaigns.length ? (
          <div className={websiteStyles.cardGrid}>
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>{campaign.name}</h3>
                  <WebsiteBadge status={campaign.status} />
                </div>
                <p className={websiteStyles.cardMeta}>
                  {campaign.buyer_segment ?? "No buyer segment"} • {formatDate(campaign.updated_at)}
                </p>
                <p className={websiteStyles.cardText}>{campaign.idea}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>No campaigns yet. Create your first campaign above.</div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
