import Link from "next/link";
import { redirect } from "next/navigation";
import { AssetTitleLink } from "@/components/assets/AssetTitleLink";
import { RemoveAssetButton } from "@/components/assets/RemoveAssetButton";
import { DeleteCampaignButton } from "@/components/campaigns/DeleteCampaignButton";
import { GenerateCampaignAssetsButton } from "@/components/campaigns/GenerateCampaignAssetsButton";
import { StartLumaYoutubeVideoButton } from "@/components/campaigns/StartLumaYoutubeVideoButton";
import { SyncLumaVideoRunButton } from "@/components/campaigns/SyncLumaVideoRunButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

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

function sceneProgress(run: Record<string, any>) {
  const current = Number(run.current_scene_index ?? 0) + 1;
  const total = Number(run.scene_count ?? 4);

  if (run.status === "completed") {
    return `${total}/${total}`;
  }

  return `${Math.min(current, total)}/${total}`;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { campaignId } = await params;
  const supabase = untypedSupabase(await createClient());

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
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const { data: lumaRunsData } = await supabase
    .from("luma_video_runs")
    .select("*")
    .eq("user_id", user.id)
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const assets = (assetsData ?? []) as Array<Record<string, any>>;
  const lumaRuns = (lumaRunsData ?? []) as Array<Record<string, any>>;
  const needsReview = assets.filter((asset) => asset.status === "needs_review").length;
  const approved = assets.filter((asset) => asset.status === "approved").length;
  const executed = assets.filter((asset) => ["published", "sent"].includes(asset.status)).length;
  const completedLumaRuns = lumaRuns.filter((run) => run.status === "completed").length;

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
          label="Luma Videos"
          value={completedLumaRuns}
          description="Completed 20-second YouTube video outputs."
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
          description="Generate assets, create a Luma YouTube video, or delete this campaign if it was created by mistake."
        >
          <article className={websiteStyles.card}>
            <WebsiteBadge status={campaign.status} />
            <p className={websiteStyles.cardText}>
              Created {formatDate(campaign.created_at)}. Updated {formatDate(campaign.updated_at)}.
            </p>
            {campaign.notes ? <p className={websiteStyles.cardText}>{campaign.notes}</p> : null}
          </article>

          <div className={websiteStyles.actionRow}>
            <StartLumaYoutubeVideoButton campaignId={campaign.id} />
            <DeleteCampaignButton
              campaignId={campaign.id}
              campaignName={campaign.name}
            />
          </div>
        </WebsiteSection>
      </section>

      <WebsiteSection
        eyebrow="YouTube Video Lane"
        title="Luma 20-second campaign video"
        description="Use Luma for the longer-form YouTube video while GalaxyAI remains the fast social media lane for Facebook and LinkedIn."
      >
        {lumaRuns.length ? (
          <div className={websiteStyles.cardGrid}>
            {lumaRuns.map((run) => (
              <article key={run.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={run.status} />
                  <span className={websiteStyles.badge}>
                    Scene {sceneProgress(run)}
                  </span>
                  <span className={websiteStyles.badge}>{run.model}</span>
                  <span className={websiteStyles.badge}>{run.resolution}</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  20-second YouTube video run
                </h3>

                <p className={websiteStyles.cardMeta}>
                  Created {formatDate(run.created_at)} • Target {run.target_seconds}s
                </p>

                {run.error ? (
                  <p className={websiteStyles.cardText}>
                    <strong>Error:</strong> {run.error}
                  </p>
                ) : null}

                {run.final_video_url ? (
                  <p className={websiteStyles.cardText}>
                    <Link href={run.final_video_url} className={websiteStyles.link}>
                      Open final Luma video →
                    </Link>
                  </p>
                ) : (
                  <p className={websiteStyles.cardText}>
                    Sync this run after each Luma scene completes. Scene 1 is text-to-video; scenes 2–4 extend the prior completed generation.
                  </p>
                )}

                {run.status !== "completed" && run.status !== "failed" && run.status !== "cancelled" ? (
                  <SyncLumaVideoRunButton runId={run.id} />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No Luma YouTube video runs yet. Start one from Campaign Controls.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Asset Pack"
        title="Generated assets"
        description="Open each asset by clicking its title, then review, revise, approve, and execute the version you trust."
      >
        {assets.length ? (
          <div className={websiteStyles.cardGrid}>
            {assets.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center gap-2">
                  <WebsiteBadge status={asset.status} />
                  <span className={websiteStyles.badge}>{asset.asset_type}</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  <AssetTitleLink
                    assetId={asset.id}
                    title={asset.title ?? asset.asset_type}
                    className="text-slate-950 underline-offset-4 transition hover:text-[#0b4a7a] hover:underline"
                  />
                </h3>

                <p className={websiteStyles.cardMeta}>
                  Version {asset.version} • {formatDate(asset.created_at)}
                </p>

                <p className={websiteStyles.cardText}>
                  {String(asset.content).slice(0, 220)}...
                </p>

                <div className={websiteStyles.actionRow}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    Open asset →
                  </Link>
                  <RemoveAssetButton assetId={asset.id} assetTitle={asset.title} compact />
                </div>
              </article>
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
