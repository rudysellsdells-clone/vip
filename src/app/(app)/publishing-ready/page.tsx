import Link from "next/link";
import { redirect } from "next/navigation";
import { ExecuteApprovedAssetButton } from "@/components/publishing/ExecuteApprovedAssetButton";
import { MarkAssetPublishedButton } from "@/components/publishing/MarkAssetPublishedButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getPublishingRoute } from "@/lib/publishing/asset-routing";
import {
  isManualPublishingAssetType,
  manualPublishingLabel,
  manualPublishingNextStep,
  PUBLISHING_READY_VISIBLE_ASSET_TYPES,
} from "@/lib/publishing/publishing-ready-visible-types";
import {
  formatScheduleTime,
  getScheduleStatus,
  scheduleBlockReason,
  scheduleStatusLabel,
} from "@/lib/publishing/schedule-status";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function typeLabel(value: string | null | undefined) {
  return String(value ?? "content").replaceAll("_", " ");
}

function channelLabel(assetType: string) {
  switch (assetType) {
    case "linkedin_post":
      return "LinkedIn";
    case "facebook_post":
      return "Facebook";
    case "email":
      return "Gmail";
    case "video_script":
      return "GalaxyAI";
    default:
      return manualPublishingLabel(assetType);
  }
}

function completedRunKey(asset: Record<string, any>) {
  const route = getPublishingRoute(asset.asset_type);
  return `${asset.id}:${route?.channel ?? channelLabel(asset.asset_type).toLowerCase()}`;
}

function groupAssets({
  assets,
  completedKeys,
}: {
  assets: Array<Record<string, any>>;
  completedKeys: Set<string>;
}) {
  const dueNow: Array<Record<string, any>> = [];
  const upcoming: Array<Record<string, any>> = [];
  const unscheduled: Array<Record<string, any>> = [];
  const alreadyExecuted: Array<Record<string, any>> = [];

  for (const asset of assets) {
    if (
      asset.scheduling_status === "published" ||
      (!isManualPublishingAssetType(asset.asset_type) && completedKeys.has(completedRunKey(asset)))
    ) {
      alreadyExecuted.push(asset);
      continue;
    }

    const scheduleStatus = getScheduleStatus(asset);

    if (scheduleStatus === "due_now") {
      dueNow.push(asset);
    } else if (scheduleStatus === "upcoming") {
      upcoming.push(asset);
    } else {
      unscheduled.push(asset);
    }
  }

  return {
    dueNow,
    upcoming,
    unscheduled,
    alreadyExecuted,
  };
}

function AssetCard({
  asset,
  executable,
  disabledReason,
}: {
  asset: Record<string, any>;
  executable: boolean;
  disabledReason?: string | null;
}) {
  const scheduleStatus = getScheduleStatus(asset);
  const manualPublishing = isManualPublishingAssetType(asset.asset_type);

  return (
    <article className={websiteStyles.card}>
      <div className="flex flex-wrap gap-2">
        <WebsiteBadge status={asset.status ?? "approved"} />
        <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
        <span className={websiteStyles.badge}>{channelLabel(asset.asset_type)}</span>
        <span className={websiteStyles.badge}>{scheduleStatusLabel(scheduleStatus)}</span>
        {manualPublishing ? (
          <span className={websiteStyles.badge}>Manual publish</span>
        ) : null}
      </div>

      <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
          {asset.title}
        </Link>
      </h3>

      <p className={websiteStyles.cardMeta}>
        Scheduled: {formatScheduleTime(asset.scheduled_publish_at)} •{" "}
        {asset.publish_timezone ?? "America/Chicago"}
      </p>

      <p className={websiteStyles.cardText}>
        {String(asset.content ?? "").slice(0, 220)}...
      </p>

      {asset.scheduling_notes ? (
        <p className={websiteStyles.cardText}>
          <strong>Schedule notes:</strong> {asset.scheduling_notes}
        </p>
      ) : null}

      {manualPublishing ? (
        <p className={websiteStyles.cardText}>
          <strong>Next:</strong> {manualPublishingNextStep(asset.asset_type)}
        </p>
      ) : null}

      <div className={websiteStyles.actionRow}>
        {manualPublishing ? (
          <MarkAssetPublishedButton
            assetId={asset.id}
            label={asset.asset_type === "prospect_what_if_story" ? "Mark Sent" : "Mark Published"}
            disabled={!executable}
          />
        ) : (
          <ExecuteApprovedAssetButton
            assetId={asset.id}
            assetType={asset.asset_type}
            disabled={!executable}
            disabledReason={disabledReason}
          />
        )}

        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
          Open asset →
        </Link>

        <Link href="/publishing-schedule" className={websiteStyles.link}>
          Adjust schedule →
        </Link>

        {asset.asset_type === "blog_post" ? (
          <Link href="/authority-content" className={websiteStyles.link}>
            Authority Content →
          </Link>
        ) : null}

        {asset.asset_type === "prospect_what_if_story" ? (
          <Link href="/what-if-stories" className={websiteStyles.link}>
            What-If Tools →
          </Link>
        ) : null}
      </div>

      {manualPublishing && !executable && disabledReason ? (
        <p className={websiteStyles.cardMeta}>{disabledReason}</p>
      ) : null}
    </article>
  );
}

function AssetSection({
  eyebrow,
  title,
  description,
  assets,
  executable,
}: {
  eyebrow: string;
  title: string;
  description: string;
  assets: Array<Record<string, any>>;
  executable: boolean;
}) {
  return (
    <WebsiteSection eyebrow={eyebrow} title={title} description={description}>
      {assets.length ? (
        <div className={websiteStyles.cardGrid}>
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              executable={executable}
              disabledReason={executable ? null : scheduleBlockReason(asset)}
            />
          ))}
        </div>
      ) : (
        <div className={websiteStyles.empty}>No assets in this section.</div>
      )}
    </WebsiteSection>
  );
}

export default async function PublishingReadyPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: approvedData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .is("archived_at", null)
    .in("asset_type", PUBLISHING_READY_VISIBLE_ASSET_TYPES)
    .order("scheduled_publish_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(80);

  const { data: runsData } = await supabase
    .from("publishing_execution_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const approvedAssets = (approvedData ?? []) as Array<Record<string, any>>;
  const runs = (runsData ?? []) as Array<Record<string, any>>;
  const completedRuns = runs.filter((run) => run.status === "completed");

  const completedKeys = new Set(
    completedRuns.map((run) => `${run.asset_id}:${run.channel}`)
  );

  const { dueNow, upcoming, unscheduled, alreadyExecuted } = groupAssets({
    assets: approvedAssets,
    completedKeys,
  });

  const manualItems = approvedAssets.filter((asset) => isManualPublishingAssetType(asset.asset_type));
  const executableItems = approvedAssets.filter((asset) => !isManualPublishingAssetType(asset.asset_type));

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publishing Readiness"
        title="Execute or manually publish approved assets when they are due."
        description="Publishing Ready is schedule-aware and now includes manual publishing items like blog posts, white papers, authority assets, and What-If outreach."
        primaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
        secondaryAction={{ label: "Ready Queue", href: "/ready-for-publishing" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Due Now"
          value={dueNow.length}
          description="Approved assets ready for their next action."
          dot="green"
        />
        <WebsiteMetric
          label="Upcoming"
          value={upcoming.length}
          description="Approved assets scheduled for later."
          dot="blue"
        />
        <WebsiteMetric
          label="Manual Items"
          value={manualItems.length}
          description="Blog, white paper, authority, and outreach items."
          dot="gold"
        />
        <WebsiteMetric
          label="Executable Items"
          value={executableItems.length}
          description="Social, email, and video actions."
          dot="purple"
        />
      </section>

      <AssetSection
        eyebrow="Due Now"
        title="Approved assets ready for action"
        description="Only this section allows execution or manual publish completion. These assets are approved and their scheduled publish time has arrived."
        assets={dueNow}
        executable={true}
      />

      <AssetSection
        eyebrow="Upcoming"
        title="Approved assets scheduled for later"
        description="These assets are approved, but their scheduled publish time has not arrived yet."
        assets={upcoming}
        executable={false}
      />

      <AssetSection
        eyebrow="Unscheduled"
        title="Approved assets missing publish time"
        description="These assets need a scheduled publish date/time before execution or manual publish completion is allowed."
        assets={unscheduled}
        executable={false}
      />

      <AssetSection
        eyebrow="Completed"
        title="Already executed or marked published"
        description="These approved assets already have completed publishing execution runs or have been manually marked published/sent."
        assets={alreadyExecuted}
        executable={false}
      />

      <WebsiteSection
        eyebrow="History"
        title="Recent publishing execution runs"
        description="This is the durable record of automated publishing/outreach execution attempts."
      >
        {runs.length ? (
          <div className={websiteStyles.cardGrid}>
            {runs.map((run) => (
              <article key={run.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={run.status ?? "prepared"} />
                  <span className={websiteStyles.badge}>{run.provider}</span>
                  <span className={websiteStyles.badge}>{run.channel}</span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  {run.destination ?? run.channel}
                </h3>

                <p className={websiteStyles.cardMeta}>
                  {formatDate(run.created_at)} • {run.action_key}
                </p>

                {run.error ? (
                  <p className={websiteStyles.cardText}>
                    <strong>Error:</strong> {run.error}
                  </p>
                ) : null}

                <div className={websiteStyles.actionRow}>
                  {run.asset_id ? (
                    <Link href={`/assets/${run.asset_id}`} className={websiteStyles.link}>
                      Open asset →
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No publishing execution runs yet.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
