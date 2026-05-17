import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteCampaignButton } from "@/components/campaigns/DeleteCampaignButton";
import { GenerateCampaignAssetsButton } from "@/components/campaigns/GenerateCampaignAssetsButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";

type PageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { campaignId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (error || !campaign) {
    redirect("/campaigns");
  }

  const { data: assetsData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false });

  const assets = (assetsData ?? []) as Array<Record<string, any>>;
  const needsReview = assets.filter((asset) => asset.status === "needs_review").length;
  const approved = assets.filter((asset) => asset.status === "approved").length;
  const executed = assets.filter((asset) => ["published", "sent"].includes(asset.status)).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Campaign Detail"
        title={campaign.name}
        description={campaign.idea}
        primaryAction={{ label: "Review Assets", href: "/approvals" }}
        secondaryAction={{ label: "All Campaigns", href: "/campaigns" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Assets"
          value={assets.length}
          description="Generated campaign assets."
          dot="blue"
        />
        <WebsiteMetric
          label="Needs Review"
          value={needsReview}
          description="Waiting for approval or revision."
          dot="gold"
        />
        <WebsiteMetric
          label="Approved"
          value={approved}
          description="Ready for execution."
          dot="green"
        />
        <WebsiteMetric
          label="Executed"
          value={executed}
          description="Published or sent assets."
          dot="purple"
        />
      </section>

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Brief"
          title="Campaign strategy inputs"
          description="The business context VIP uses to generate campaign assets."
        >
          <div className={websiteStyles.cardGrid}>
            <article className={websiteStyles.card}>
              <h3 className={websiteStyles.cardTitle}>Buyer and audience</h3>
              <p className={websiteStyles.cardText}>
                <strong>Buyer segment:</strong> {campaign.buyer_segment ?? "Not specified"}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>Audience:</strong> {campaign.audience ?? "Not specified"}
              </p>
            </article>

            <article className={websiteStyles.card}>
              <h3 className={websiteStyles.cardTitle}>Goal and CTA</h3>
              <p className={websiteStyles.cardText}>
                <strong>Goal:</strong> {campaign.goal ?? "Not specified"}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>CTA:</strong> {campaign.cta ?? "Not specified"}
              </p>
            </article>
          </div>

          <div className={websiteStyles.actionRow}>
            <GenerateCampaignAssetsButton campaignId={campaign.id} />
          </div>
        </WebsiteSection>

        <WebsiteSection
          eyebrow="Status"
          title="Campaign controls"
          description="Generate assets, review the campaign state, or delete this campaign if it was created by mistake."
        >
          <article className={websiteStyles.card}>
            <WebsiteBadge status={campaign.status} />
            <p className={websiteStyles.cardText}>
              Created {formatDate(campaign.created_at)}. Updated {formatDate(campaign.updated_at)}.
            </p>
            {campaign.notes ? <p className={websiteStyles.cardText}>{campaign.notes}</p> : null}
          </article>

          <div className={websiteStyles.actionRow}>
            <DeleteCampaignButton
              campaignId={campaign.id}
              campaignName={campaign.name}
            />
          </div>
        </WebsiteSection>
      </section>

      <WebsiteSection
        eyebrow="Asset Pack"
        title="Generated assets"
        description="Open each asset to review, revise, approve, and execute the version you trust."
      >
        {assets.length ? (
          <div className={websiteStyles.cardGrid}>
            {assets.map((asset) => (
              <Link key={asset.id} href={`/assets/${asset.id}`} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={websiteStyles.cardTitle}>{asset.title ?? asset.asset_type}</h3>
                  <WebsiteBadge status={asset.status} />
                </div>
                <p className={websiteStyles.cardMeta}>
                  {asset.asset_type} • Version {asset.version} • {formatDate(asset.created_at)}
                </p>
                <p className={websiteStyles.cardText}>
                  {String(asset.content).slice(0, 220)}...
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No assets generated yet. Use the Generate Asset Pack button above.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
