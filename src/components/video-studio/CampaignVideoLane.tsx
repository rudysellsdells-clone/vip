import Link from "next/link";
import {
  WebsiteBadge,
  WebsiteMetric,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import {
  buildCampaignVideoReadiness,
  buildVideoUsageSummary,
} from "@/lib/video-studio/campaign-video-readiness";
import { isVideoStudioEnabled } from "@/lib/video-studio/feature";
import {
  normalizeLumaRun,
  normalizeMagicaRun,
  VIDEO_PROVIDER_REGISTRY,
  type UnifiedVideoRun,
} from "@/lib/video-studio/provider-registry";
import {
  recordValue,
  videoPackageFromMetadata,
} from "@/lib/video-studio/video-asset";
import type { VideoPackage } from "@/lib/video-studio/video-package";

type VideoAssetRow = {
  id: string;
  account_id: string | null;
  asset_type: string;
  title: string;
  status: string | null;
  metadata: unknown;
  created_at: string;
};

type VideoPackageRow = {
  asset: VideoAssetRow;
  videoPackage: VideoPackage;
  run: UnifiedVideoRun | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function renderRunId(metadata: unknown) {
  const render = recordValue(recordValue(metadata).render);
  return typeof render.runId === "string" && render.runId.trim()
    ? render.runId.trim()
    : null;
}

function displayRenderStatus(run: UnifiedVideoRun | null) {
  if (!run) return "not_started";
  if (run.renderStatus === "rendering") return "running";
  if (run.renderStatus === "cancelled") return "canceled";
  return run.renderStatus;
}

export async function CampaignVideoLane({ campaignId }: { campaignId: string }) {
  if (!isVideoStudioEnabled()) return null;

  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id,account_id,name")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign?.account_id) return null;

  const accountId = String(campaign.account_id);
  const access = await getAccountAccessForUser({
    supabase,
    accountId,
    userId: user.id,
  });
  if (!access.canView) return null;

  const [assetResult, lumaResult, magicaResult] = await Promise.all([
    supabase
      .from("generated_assets")
      .select("id,account_id,asset_type,title,status,metadata,created_at")
      .eq("account_id", accountId)
      .eq("campaign_id", campaignId)
      .in("asset_type", ["video_script", "galaxyai_prompt"])
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("luma_video_runs")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("galaxyai_runs")
      .select("*")
      .eq("account_id", accountId)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const runs = [
    ...((lumaResult.data ?? []) as Array<Record<string, unknown>>).map(
      normalizeLumaRun,
    ),
    ...((magicaResult.data ?? []) as Array<Record<string, unknown>>).map(
      normalizeMagicaRun,
    ),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const runById = new Map(runs.map((run) => [run.id, run]));
  const runByAssetId = new Map(
    runs
      .filter((run) => run.sourceAssetId)
      .map((run) => [String(run.sourceAssetId), run]),
  );

  const packages = ((assetResult.data ?? []) as VideoAssetRow[])
    .map((asset): VideoPackageRow | null => {
      const videoPackage = videoPackageFromMetadata(asset.metadata);
      if (!videoPackage) return null;
      const storedRunId = renderRunId(asset.metadata);
      const linkedRun =
        runByAssetId.get(asset.id) ??
        (storedRunId ? runById.get(storedRunId) ?? null : null);
      return { asset, videoPackage, run: linkedRun };
    })
    .filter((item): item is VideoPackageRow => Boolean(item));

  const readiness = buildCampaignVideoReadiness(
    packages.map(({ asset, videoPackage, run }) => ({
      provider: videoPackage.provider,
      assetStatus: asset.status,
      renderStatus: run?.renderStatus ?? null,
    })),
  );
  const usage = buildVideoUsageSummary(runs);
  const actionHref =
    readiness.nextAction.href === "/video-studio"
      ? `/video-studio?campaignId=${encodeURIComponent(campaignId)}`
      : readiness.nextAction.href;

  return (
    <div className="mx-auto max-w-[1480px] px-[34px] pb-[68px] pl-[40px] max-md:px-4">
      <div id="video" className="scroll-mt-24">
        <WebsiteSection
          eyebrow="Campaign Video"
          title="Video package and render readiness"
          description="Video packages inherit this campaign's approved strategy, source lineage, review decision, provider status, and existing Luma or Magica run history."
        >
          <div className={websiteStyles.metricsGrid}>
            <WebsiteMetric
              label="Video packages"
              value={readiness.packageCount}
              description={`${readiness.lumaPackageCount} Luma and ${readiness.magicaPackageCount} Magica package(s).`}
              dot="blue"
            />
            <WebsiteMetric
              label="Needs review"
              value={readiness.needsReviewCount}
              description="Packages awaiting approval or revision before rendering."
              href="/approvals"
              dot="gold"
            />
            <WebsiteMetric
              label="Active renders"
              value={readiness.activeRenderCount}
              description={`${readiness.readyToRenderCount} approved package(s) are ready to start.`}
              dot="purple"
            />
            <WebsiteMetric
              label="Completed"
              value={readiness.completedRenderCount}
              description={`${usage.totalAttempts} total provider attempt(s); ${usage.failedAttempts} failed.`}
              dot="green"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border border-slate-200 bg-slate-50 p-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-950">
                {readiness.nextAction.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {readiness.nextAction.description}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Provider usage: {usage.lumaAttempts} Luma • {usage.magicaAttempts} Magica • {usage.activeAttempts} active
              </p>
            </div>
            <Link
              href={actionHref}
              className="inline-flex bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              {readiness.nextAction.label} →
            </Link>
          </div>

          {packages.length ? (
            <div className={`${websiteStyles.cardGrid} mt-6`}>
              {packages.slice(0, 6).map(({ asset, videoPackage, run }) => (
                <article key={asset.id} className={websiteStyles.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={websiteStyles.sectionEyebrow}>
                        {VIDEO_PROVIDER_REGISTRY[videoPackage.provider].label} • {videoPackage.aspectRatio}
                      </p>
                      <h3 className={websiteStyles.cardTitle}>{asset.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <WebsiteBadge status={asset.status} />
                      <WebsiteBadge status={displayRenderStatus(run)} />
                    </div>
                  </div>
                  <p className={websiteStyles.cardText}>{videoPackage.hook}</p>
                  <p className={websiteStyles.cardMeta}>
                    Generated {formatDate(asset.created_at)} • {videoPackage.durationSeconds}s
                  </p>
                  {run?.error ? (
                    <p className="mt-3 text-sm leading-6 text-red-700">{run.error}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="inline-flex bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
                    >
                      Open Package →
                    </Link>
                    <Link href={actionHref} className={websiteStyles.link}>
                      Open Video Studio →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
              This campaign does not have a Video Studio package yet. Create one from the approved campaign Marketing Spine or an approved Ad Studio package.
            </div>
          )}
        </WebsiteSection>
      </div>
    </div>
  );
}
