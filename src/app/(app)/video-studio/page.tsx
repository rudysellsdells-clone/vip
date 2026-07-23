import Link from "next/link";
import { notFound } from "next/navigation";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";
import { isVideoStudioEnabled } from "@/lib/video-studio/feature";
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

export default async function VideoStudioPage() {
  if (!isVideoStudioEnabled()) notFound();

  const { supabase, accountId, accountName, isMaster } =
    await requireStrategyWorkspace();
  const [campaignResult, magicaResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,name")
      .eq("account_id", accountId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("galaxyai_runs")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const campaigns = (campaignResult.data ?? []) as CampaignRow[];
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
    ...((lumaResult.data ?? []) as Array<Record<string, unknown>>).map(
      normalizeLumaRun,
    ),
    ...((magicaResult.data ?? []) as Array<Record<string, unknown>>).map(
      normalizeMagicaRun,
    ),
  ]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 24);
  const campaignNameById = new Map(
    campaigns.map((campaign) => [campaign.id, campaign.name]),
  );
  const providerStatus = providerConfigurationStatus({
    lumaApiKey: process.env.LUMA_API_KEY,
    magicaApiKey: process.env.MAGICA_API_KEY,
    galaxyAiApiKey: process.env.GALAXYAI_API_KEY,
  });
  const activeRuns = runs.filter((run) =>
    ["queued", "rendering"].includes(run.renderStatus),
  ).length;
  const completedRuns = runs.filter(
    (run) => run.renderStatus === "completed",
  ).length;
  const failedRuns = runs.filter((run) => run.renderStatus === "failed").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Create • Video Studio"
        title={`Unified video workspace for ${accountName}`}
        description="Bring campaign strategy, approved advertising concepts, scripts, provider execution, review, and final media into one workspace while preserving the existing Luma and Magica systems underneath."
        primaryAction={{ label: "Open Campaigns", href: "/campaigns" }}
        secondaryAction={{ label: "Open Ad Studio", href: "/ad-studio" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Configured providers"
          value={[providerStatus.luma, providerStatus.magica].filter(Boolean).length}
          description="Luma and Magica credentials available to this deployment."
          dot="blue"
        />
        <WebsiteMetric
          label="Active renders"
          value={activeRuns}
          description="Queued or rendering provider runs in this workspace."
          dot="gold"
        />
        <WebsiteMetric
          label="Completed"
          value={completedRuns}
          description="Finished Luma and Magica runs currently visible."
          dot="green"
        />
        <WebsiteMetric
          label="Needs attention"
          value={failedRuns}
          description="Provider runs with a recorded failure."
          dot={failedRuns ? "red" : "purple"}
        />
      </section>

      <WebsiteSection
        eyebrow="Foundation"
        title="One workflow above two proven provider systems"
        description="H1.18 begins with a provider-neutral package and status contract. Existing Luma scene extension and Magica/GalaxyAI workflow execution remain intact and become compatibility adapters rather than being replaced."
      >
        <div className={websiteStyles.cardGrid}>
          {Object.values(VIDEO_PROVIDER_REGISTRY).map((provider) => {
            const configured = providerStatus[provider.id];
            return (
              <article key={provider.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={websiteStyles.sectionEyebrow}>
                      {provider.executionMode.replaceAll("_", " ")}
                    </p>
                    <h3 className={websiteStyles.cardTitle}>{provider.label}</h3>
                  </div>
                  <WebsiteBadge status={configured ? "completed" : "draft"} />
                </div>
                <p className={websiteStyles.cardText}>{provider.currentSystem}</p>
                <p className={websiteStyles.cardMeta}>
                  {provider.capabilities
                    .map((capability) => capability.replaceAll("_", " "))
                    .join(" • ")}
                </p>
              </article>
            );
          })}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Source lanes"
        title="Campaign-to-video and ad-to-video are the next execution layer"
        description="The foundation preserves source lineage so every video package can identify the approved campaign or ad concept that supplied its objective, audience, offer, CTA, strategy signatures, and research evidence."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Campaign to video</h3>
            <p className={websiteStyles.cardText}>
              Build scripts, hooks, voiceover, shots, duration, and format from an approved Marketing Spine.
            </p>
            <Link href="/campaigns" className={websiteStyles.link}>
              Open approved campaigns →
            </Link>
          </article>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Ad concept to video</h3>
            <p className={websiteStyles.cardText}>
              Carry an approved Meta, LinkedIn, or Google concept into motion without losing its CTA or attribution lineage.
            </p>
            <Link href="/ad-studio" className={websiteStyles.link}>
              Open Ad Studio →
            </Link>
          </article>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Provider administration</h3>
            <p className={websiteStyles.cardText}>
              Existing provider workflows remain available while the unified customer-facing experience is assembled.
            </p>
            {isMaster ? (
              <Link href="/galaxyai" className={websiteStyles.link}>
                Open media providers →
              </Link>
            ) : (
              <span className={websiteStyles.cardMeta}>
                Provider administration is managed by the platform team.
              </span>
            )}
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Compatibility history"
        title="Existing video and media runs"
        description="Provider-specific records are normalized into one read-only history before unified generation and review controls are added."
      >
        {runs.length ? (
          <div className={websiteStyles.cardGrid}>
            {runs.map((run) => (
              <article key={`${run.provider}-${run.id}`} className={websiteStyles.card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={websiteStyles.sectionEyebrow}>
                      {VIDEO_PROVIDER_REGISTRY[run.provider].label}
                    </p>
                    <h3 className={websiteStyles.cardTitle}>{run.title}</h3>
                  </div>
                  <WebsiteBadge status={runStatus(run)} />
                </div>
                <p className={websiteStyles.cardMeta}>
                  {run.campaignId
                    ? campaignNameById.get(run.campaignId) ?? "Campaign"
                    : "Unassigned source"}
                  {" • "}
                  Updated {formatDate(run.updatedAt)}
                </p>
                {run.error ? (
                  <p className="mt-3 text-sm leading-6 text-red-700">
                    {run.error}
                  </p>
                ) : null}
                {run.outputUrl ? (
                  <a
                    href={run.outputUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={websiteStyles.link}
                  >
                    Open provider output →
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No Luma or Magica video runs are recorded for this workspace yet.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
