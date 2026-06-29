import Link from "next/link";
import { redirect } from "next/navigation";
import { ArchiveActionButton } from "@/components/archive/ArchiveActionButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { CAMPAIGN_ASSET_TYPES } from "@/lib/archive/archive-utils";
import { getActiveWorkspaceForUser } from "@/lib/accounts/active-workspace";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function titleForCampaign(campaign: Record<string, any>) {
  return campaign.name ?? campaign.title ?? campaign.idea ?? "Untitled campaign";
}

function typeLabel(value: string | null | undefined) {
  return String(value ?? "asset").replaceAll("_", " ");
}

export default async function ArchivePage() {
  const supabase = untypedSupabase(await createClient());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

  if (!workspace) redirect("/accounts");

  const activeWorkspace = workspace!;

  const { data: archivedCampaignsData } = await supabase
    .from("campaigns")
    .select("*")
    .eq("account_id", activeWorkspace.activeAccountId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(40);

  const { data: archivedAssetsData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("account_id", activeWorkspace.activeAccountId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(60);

  const { data: activeOrphanAssetsData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("account_id", activeWorkspace.activeAccountId)
    .is("campaign_id", null)
    .is("archived_at", null)
    .in("asset_type", CAMPAIGN_ASSET_TYPES)
    .order("created_at", { ascending: false })
    .limit(40);

  const archivedCampaigns = (archivedCampaignsData ?? []) as Array<Record<string, any>>;
  const archivedAssets = (archivedAssetsData ?? []) as Array<Record<string, any>>;
  const activeOrphanAssets = (activeOrphanAssetsData ?? []) as Array<Record<string, any>>;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow={`Archive • ${activeWorkspace.activeAccountName}`}
        title="Keep old campaigns and assets out of the working area."
        description="Archived items are preserved for reference but removed from active workflows once working pages are filtered."
        primaryAction={{ label: "Campaigns", href: "/campaigns" }}
        secondaryAction={{ label: "Approvals", href: "/approvals" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Archived Campaigns" value={archivedCampaigns.length} description="Campaigns moved out of active work." dot="blue" />
        <WebsiteMetric label="Archived Assets" value={archivedAssets.length} description="Assets moved out of active work." dot="gold" />
        <WebsiteMetric label="Orphan Campaign Assets" value={activeOrphanAssets.length} description="Unlinked active assets that may be leftovers from deleted campaigns." dot="purple" />
        <WebsiteMetric label="Mode" value="Safe" description="Archive, not hard delete." dot="green" />
      </section>

      <WebsiteSection eyebrow="Cleanup" title="Active orphan campaign assets" description="If these are leftovers from deleted campaigns, archive them here to clean up working pages.">
        {activeOrphanAssets.length ? (
          <div className={websiteStyles.cardGrid}>
            {activeOrphanAssets.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={asset.status ?? "active"} />
                  <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
                </div>
                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>{asset.title}</Link>
                </h3>
                <p className={websiteStyles.cardMeta}>Created {formatDate(asset.created_at)}</p>
                <p className={websiteStyles.cardText}>{String(asset.content ?? "").slice(0, 220)}...</p>
                <div className={websiteStyles.actionRow}>
                  <ArchiveActionButton endpoint={`/api/assets/${asset.id}/archive`} label="Archive Asset" confirmMessage="Archive this orphaned asset?" successMessage="Asset archived." />
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>Open asset →</Link>
                </div>
              </article>
            ))}
          </div>
        ) : <div className={websiteStyles.empty}>No active orphan campaign assets found.</div>}
      </WebsiteSection>

      <WebsiteSection eyebrow="Campaigns" title="Archived campaigns" description="Restoring a campaign also restores assets tied to that campaign.">
        {archivedCampaigns.length ? (
          <div className={websiteStyles.cardGrid}>
            {archivedCampaigns.map((campaign) => (
              <article key={campaign.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2"><WebsiteBadge status="archived" /></div>
                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>{titleForCampaign(campaign)}</h3>
                <p className={websiteStyles.cardMeta}>Archived {formatDate(campaign.archived_at)}</p>
                {campaign.archived_reason ? <p className={websiteStyles.cardText}><strong>Reason:</strong> {campaign.archived_reason}</p> : null}
                <ArchiveActionButton endpoint={`/api/campaigns/${campaign.id}/restore`} label="Restore Campaign" confirmMessage="Restore this campaign and linked assets?" successMessage="Campaign restored." />
              </article>
            ))}
          </div>
        ) : <div className={websiteStyles.empty}>No archived campaigns yet.</div>}
      </WebsiteSection>

      <WebsiteSection eyebrow="Assets" title="Archived assets" description="Archived generated assets are preserved here for reference.">
        {archivedAssets.length ? (
          <div className={websiteStyles.cardGrid}>
            {archivedAssets.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2"><WebsiteBadge status="archived" /><span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span></div>
                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>{asset.title}</Link>
                </h3>
                <p className={websiteStyles.cardMeta}>Archived {formatDate(asset.archived_at)}</p>
                {asset.archived_reason ? <p className={websiteStyles.cardText}><strong>Reason:</strong> {asset.archived_reason}</p> : null}
                <div className={websiteStyles.actionRow}>
                  <ArchiveActionButton endpoint={`/api/assets/${asset.id}/restore`} label="Restore Asset" confirmMessage="Restore this asset?" successMessage="Asset restored." />
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>Open asset →</Link>
                </div>
              </article>
            ))}
          </div>
        ) : <div className={websiteStyles.empty}>No archived assets yet.</div>}
      </WebsiteSection>
    </WebsitePage>
  );
}
