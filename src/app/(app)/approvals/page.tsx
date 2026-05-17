import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssetReviewActions } from "@/components/approvals/AssetReviewActions";
import { RequestRevisionButton } from "@/components/assets/RequestRevisionButton";
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

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assetsData, error } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["needs_review", "revision_requested"])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) console.error("Failed to load approval assets", error);

  const assets = (assetsData ?? []) as Array<Record<string, any>>;
  const needsReviewCount = assets.filter((asset) => asset.status === "needs_review").length;
  const revisionCount = assets.filter((asset) => asset.status === "revision_requested").length;

  const campaignIds = Array.from(new Set(assets.map((asset) => asset.campaign_id).filter(Boolean))) as string[];
  let campaignNameById = new Map<string, string>();

  if (campaignIds.length > 0) {
    const { data: campaignsData } = await supabase
      .from("campaigns")
      .select("id,name")
      .eq("user_id", user.id)
      .in("id", campaignIds);

    campaignNameById = new Map(((campaignsData ?? []) as Array<Record<string, any>>).map((campaign) => [campaign.id, campaign.name]));
  }

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Approval Queue"
        title="Review assets before anything goes live."
        description="Approve, reject, or revise generated assets with a clear decision workflow. This keeps VIP useful without letting automation run ahead of you."
        primaryAction={{ label: "Create Campaign", href: "/campaigns" }}
        secondaryAction={{ label: "View Actions", href: "/actions" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Needs Review" value={needsReviewCount} description="Fresh assets waiting for your decision." dot="gold" />
        <WebsiteMetric label="Revision Requested" value={revisionCount} description="Original versions with a revision path." dot="purple" />
        <WebsiteMetric label="Total Queue" value={assets.length} description="All visible review items." dot="blue" />
        <WebsiteMetric label="Next Step" value="Review" description="Read, revise, approve, then execute." dot="green" />
      </section>

      <WebsiteSection
        eyebrow="Decision Workspace"
        title="Assets waiting for review"
        description="Each asset has clear content, status, version, history link, and action controls."
      >
        {assets.length ? (
          <div className={websiteStyles.cardGrid}>
            {assets.map((asset) => {
              const campaignName = asset.campaign_id
                ? campaignNameById.get(asset.campaign_id) ?? "Campaign unavailable"
                : "No campaign";

              return (
                <article key={asset.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap gap-2">
                    <WebsiteBadge status={asset.status} />
                    <span className={websiteStyles.badge}>Version {asset.version}</span>
                    <span className={websiteStyles.badge}>{asset.asset_type}</span>
                  </div>

                  <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                    {asset.title ?? "Untitled asset"}
                  </h3>
                  <p className={websiteStyles.cardMeta}>
                    {campaignName} • Updated {formatDate(asset.updated_at)}
                  </p>

                  <pre className={websiteStyles.cardContentBox}>{asset.content}</pre>

                  <div className={websiteStyles.cardActions}>
                    <AssetReviewActions assetId={asset.id} />
                    <RequestRevisionButton assetId={asset.id} assetTitle={asset.title} />
                    <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                      View details and revision history →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            Nothing needs review right now. Generate a campaign asset pack and review items will appear here.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
