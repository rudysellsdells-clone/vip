import Link from "next/link";
import { notFound } from "next/navigation";
import {
  VideoPackageBuilder,
  type VideoAdOption,
  type VideoCampaignOption,
} from "@/components/video-studio/VideoPackageBuilder";
import {
  VideoRenderButton,
  type VideoWorkflowOption,
} from "@/components/video-studio/VideoRenderButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { extractOneOffStrategyGate } from "@/lib/content-generation/one-off-strategy-gate";
import { getVipManagedGalaxyWorkflowMetadata } from "@/lib/galaxyai/workflow-metadata";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";
import {
  adPackageFromMetadata,
  recordValue,
  videoPackageFromMetadata,
} from "@/lib/video-studio/video-asset";
import { isVideoStudioEnabled } from "@/lib/video-studio/feature";
import type { VideoPackage } from "@/lib/video-studio/video-package";
import {
  normalizeLumaRun,
  normalizeMagicaRun,
  providerConfigurationStatus,
  VIDEO_PROVIDER_REGISTRY,
  type UnifiedVideoRun,
} from "@/lib/video-studio/provider-registry";

export const dynamic = "force-dynamic";

type CampaignRow = {
  id: string;
  name: string;
  strategy: unknown;
};

type AssetRow = {
  id: string;
  campaign_id: string | null;
  asset_type: string;
  title: string;
  status: string;
  metadata: unknown;
  created_at: string;
};

type WorkflowRow = {
  galaxy_workflow_id: string;
  name: string;
  metadata: unknown;
  active: boolean;
};

function formatDate(value: string) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function runStatus(run: UnifiedVideoRun) {
  if (run.renderStatus === "rendering") return "running";
  if (run.renderStatus === "cancelled") return "canceled";
  return run.renderStatus;
}

function campaignOption(campaign: CampaignRow): VideoCampaignOption | null {
  const gate = extractOneOffStrategyGate(campaign.strategy);
  if (!gate || gate.status !== "approved") return null;
  return {
    id: campaign.id,
    name: campaign.name,
    objective: gate.strategy.campaignObjective,
    audience: gate.strategy.targetAudience,
    offer: [gate.strategy.offerExplanation, gate.strategy.offerDeliverables]
      .filter(Boolean)
      .join(" — "),
  };
}

function adOption(asset: AssetRow): VideoAdOption | null {
  const adPackage = adPackageFromMetadata(asset.metadata);
  if (!adPackage || asset.status !== "approved") return null;
  return {
    id: asset.id,
    title: asset.title,
    campaignName: adPackage.campaignName,
    channel: adPackage.channel,
    objective: adPackage.objective,
    audience: adPackage.audience,
  };
}

export default async function VideoStudioPage() {
  if (!isVideoStudioEnabled()) notFound();

  const { supabase, accountId, accountName, canManage, isMaster } =
    await requireStrategyWorkspace();
  const [campaignResult, magicaResult, assetResult, workflowResult, accountResult] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("id,name,strategy")
        .eq("account_id", accountId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("galaxyai_runs")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("generated_assets")
        .select("id,campaign_id,asset_type,title,status,metadata,created_at")
        .eq("account_id", accountId)
        .in("asset_type", [
          "search_ad",
          "facebook_post",
          "linkedin_post",
          "video_script",
          "galaxyai_prompt",
        ])
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("galaxyai_workflows")
        .select("galaxy_workflow_id,name,metadata,active")
        .eq("account_id", accountId)
        .eq("active", true)
        .order("name", { ascending: true }),
      supabase
        .from("accounts")
        .select("website_url,primary_cta")
        .eq("id", accountId)
        .maybeSingle(),
    ]);

  const campaigns = (campaignResult.data ?? []) as CampaignRow[];
  const campaignOptions = campaigns
    .map(campaignOption)
    .filter((item): item is VideoCampaignOption => Boolean(item));
  const assets = (assetResult.data ?? []) as AssetRow[];
  const adOptions = assets
    .map(adOption)
    .filter((item): item is VideoAdOption => Boolean(item));
  const videoAssets = assets
    .map((asset) => ({ asset, videoPackage: videoPackageFromMetadata(asset.metadata) }))
    .filter((item) => Boolean(item.videoPackage))
    .slice(0, 24) as Array<{ asset: AssetRow; videoPackage: VideoPackage }>;
  const workflows = ((workflowResult.data ?? []) as WorkflowRow[])
    .filter((workflow) => {
      const metadata = getVipManagedGalaxyWorkflowMetadata(workflow.metadata);
      return !metadata || metadata.workflowKind === "vip_social_image_video";
    })
    .map((workflow): VideoWorkflowOption => ({
      id: workflow.galaxy_workflow_id,
      name: workflow.name,
    }));

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const lumaResult = campaignIds.length
    ? await supabase
        .from("luma_video_runs")
        .select("*")
        .in("campaign_id", campaignIds)
        .order("created_at", { ascending: false })
        .limit(40)
    : { data: [] };
  const runs = [
    ...((lumaResult.data ?? []) as Array<Record<string, unknown>>).map(normalizeLumaRun),
    ...((magicaResult.data ?? []) as Array<Record<string, unknown>>).map(normalizeMagicaRun),
  ]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 24);
  const campaignNameById = new Map(campaigns.map((campaign) => [campaign.id, campaign.name]));
  const providerStatus = providerConfigurationStatus({
    lumaApiKey: process.env.LUMA_API_KEY,
    magicaApiKey: process.env.MAGICA_API_KEY,
    galaxyAiApiKey: process.env.GALAXYAI_API_KEY,
  });
  const account = recordValue(accountResult.data);
  const defaultDestinationUrl =
    (typeof account.primary_cta === "string" && account.primary_cta.startsWith("http")
      ? account.primary_cta
      : "") ||
    (typeof account.website_url === "string" ? account.website_url : "");
  const activeRuns = runs.filter((run) => ["queued", "rendering"].includes(run.renderStatus)).length;
  const completedRuns = runs.filter((run) => run.renderStatus === "completed").length;
  const needsReview = videoAssets.filter((item) => item.asset.status === "needs_review").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Create • Video Studio"
        title={`Unified video workspace for ${accountName}`}
        description="Turn an approved campaign or advertising concept into a complete video package, approve it, and then render through Luma or Magica without losing its strategy, research, CTA, or source lineage."
        primaryAction={{ label: "Review Video Assets", href: "/approvals" }}
        secondaryAction={{ label: "Open Ad Studio", href: "/ad-studio" }}
      />

      <WebsiteSection
        eyebrow="Video creation"
        title="Build a campaign-to-video or ad-to-video package"
        description="VIP creates a 20-second concept, script, voiceover, four-scene shot list, provider direction, and approval-gated render package from an approved source."
      >
        <VideoPackageBuilder
          campaigns={campaignOptions}
          ads={adOptions}
          defaultDestinationUrl={defaultDestinationUrl}
          canManage={canManage}
        />
      </WebsiteSection>

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Configured providers"
          value={[providerStatus.luma, providerStatus.magica].filter(Boolean).length}
          description="Luma and Magica credentials available to this deployment."
          dot="blue"
        />
        <WebsiteMetric
          label="Video packages"
          value={videoAssets.length}
          description="Recent provider-ready packages in this workspace."
          dot="purple"
        />
        <WebsiteMetric
          label="Needs review"
          value={needsReview}
          description="Packages that must be approved before provider rendering."
          dot="gold"
        />
        <WebsiteMetric
          label="Completed renders"
          value={completedRuns}
          description={`${activeRuns} additional render${activeRuns === 1 ? " is" : "s are"} active.`}
          dot="green"
        />
      </section>

      <WebsiteSection
        eyebrow="Video operations"
        title="Generated video packages"
        description="Every package enters Needs Review. Provider execution remains blocked until the package is explicitly approved."
      >
        {videoAssets.length ? (
          <div className={websiteStyles.cardGrid}>
            {videoAssets.map(({ asset, videoPackage }) => {
              const metadata = recordValue(asset.metadata);
              const render = recordValue(metadata.render);
              const existingRunId = typeof render.runId === "string" ? render.runId : null;
              return (
                <article key={asset.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={websiteStyles.sectionEyebrow}>
                        {VIDEO_PROVIDER_REGISTRY[videoPackage.provider].label} • {videoPackage.aspectRatio}
                      </p>
                      <h3 className={websiteStyles.cardTitle}>{asset.title}</h3>
                    </div>
                    <WebsiteBadge status={asset.status} />
                  </div>
                  <p className={websiteStyles.cardText}>{videoPackage.hook}</p>
                  <p className={websiteStyles.cardMeta}>
                    {videoPackage.source.title} • {videoPackage.durationSeconds}s • Created {formatDate(asset.created_at)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>Open package →</Link>
                    <Link href="/approvals" className={websiteStyles.link}>Open review →</Link>
                  </div>
                  <VideoRenderButton
                    assetId={asset.id}
                    provider={videoPackage.provider}
                    status={asset.status}
                    workflows={workflows}
                    existingRunId={existingRunId}
                    canManage={canManage}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <div className={websiteStyles.empty}>No Video Studio packages have been generated yet.</div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Provider history"
        title="Luma and Magica render activity"
        description="Existing provider-specific records remain intact and are normalized into one operational history."
      >
        {runs.length ? (
          <div className={websiteStyles.cardGrid}>
            {runs.map((run) => (
              <article key={`${run.provider}-${run.id}`} className={websiteStyles.card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={websiteStyles.sectionEyebrow}>{VIDEO_PROVIDER_REGISTRY[run.provider].label}</p>
                    <h3 className={websiteStyles.cardTitle}>{run.title}</h3>
                  </div>
                  <WebsiteBadge status={runStatus(run)} />
                </div>
                <p className={websiteStyles.cardMeta}>
                  {run.campaignId ? campaignNameById.get(run.campaignId) ?? "Campaign" : "Unassigned source"}
                  {" • "}Updated {formatDate(run.updatedAt)}
                </p>
                {run.error ? <p className="mt-3 text-sm leading-6 text-red-700">{run.error}</p> : null}
                {run.outputUrl ? (
                  <a href={run.outputUrl} target="_blank" rel="noreferrer" className={websiteStyles.link}>
                    Open provider output →
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>No Luma or Magica renders are recorded for this workspace yet.</div>
        )}
      </WebsiteSection>

      {isMaster ? (
        <WebsiteSection
          eyebrow="Provider administration"
          title="Existing provider controls remain available"
          description="Workflow provisioning and provider diagnostics remain separate from the customer-facing Video Studio."
        >
          <Link href="/galaxyai" className={websiteStyles.link}>Open media provider administration →</Link>
        </WebsiteSection>
      ) : null}
    </WebsitePage>
  );
}
