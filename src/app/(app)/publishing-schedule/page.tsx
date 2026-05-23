import Link from "next/link";
import { redirect } from "next/navigation";
import { AssignMonthlyScheduleButton } from "@/components/publishing-schedule/AssignMonthlyScheduleButton";
import { ScheduleAssetButton } from "@/components/publishing-schedule/ScheduleAssetButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { channelLabel, SCHEDULABLE_ASSET_TYPES } from "@/lib/publishing-schedule/defaults";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDateTime(value: string | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function typeLabel(value: string | null | undefined) {
  return String(value ?? "asset").replaceAll("_", " ");
}

export default async function PublishingSchedulePage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: assetsData } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .in("asset_type", SCHEDULABLE_ASSET_TYPES)
    .order("scheduled_publish_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const assets = (assetsData ?? []) as Array<Record<string, any>>;
  const scheduled = assets.filter((asset) => asset.scheduling_status === "scheduled" && asset.scheduled_publish_at);
  const unscheduled = assets.filter((asset) => !asset.scheduled_publish_at || asset.scheduling_status === "unscheduled");
  const approved = assets.filter((asset) => asset.status === "approved");
  const readyForPublishing = assets.filter((asset) =>
    ["linkedin_post", "facebook_post", "email", "video_script"].includes(asset.asset_type)
  );

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publishing Schedule"
        title="Space content out across the month."
        description="Give every monthly content asset a publish date and time so VIP does not blast everything at once."
        primaryAction={{ label: "Content Calendar", href: "/content-calendar" }}
        secondaryAction={{ label: "Ready Queue", href: "/ready-for-publishing" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Schedulable Assets"
          value={assets.length}
          description="Active assets that can receive publish times."
          dot="blue"
        />
        <WebsiteMetric
          label="Scheduled"
          value={scheduled.length}
          description="Assets with publish date/time."
          dot="green"
        />
        <WebsiteMetric
          label="Unscheduled"
          value={unscheduled.length}
          description="Assets still needing a time slot."
          dot="gold"
        />
        <WebsiteMetric
          label="Execution Candidates"
          value={readyForPublishing.length}
          description="Social, email, and video assets."
          dot="purple"
        />
      </section>

      <WebsiteSection
        eyebrow="Monthly Scheduling"
        title="Assign a monthly schedule"
        description="This staggers unscheduled assets using a default weekly cadence. You can still adjust individual times below."
      >
        <div className={websiteStyles.card}>
          <AssignMonthlyScheduleButton />
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Calendar"
        title="Scheduled content"
        description="Review the publish order and adjust individual dates or times when needed."
      >
        {assets.length ? (
          <div className={websiteStyles.cardGrid}>
            {assets.map((asset) => (
              <article key={asset.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={asset.status ?? "needs_review"} />
                  <span className={websiteStyles.badge}>{typeLabel(asset.asset_type)}</span>
                  <span className={websiteStyles.badge}>{channelLabel(asset.asset_type)}</span>
                  <span className={websiteStyles.badge}>
                    {asset.scheduling_status ?? "unscheduled"}
                  </span>
                </div>

                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    {asset.title}
                  </Link>
                </h3>

                <p className={websiteStyles.cardMeta}>
                  Publish: {formatDateTime(asset.scheduled_publish_at)} •{" "}
                  {asset.publish_timezone ?? "America/Chicago"}
                </p>

                {asset.scheduling_notes ? (
                  <p className={websiteStyles.cardText}>{asset.scheduling_notes}</p>
                ) : (
                  <p className={websiteStyles.cardText}>
                    No scheduling notes yet. Assign a monthly schedule or set a custom publish time.
                  </p>
                )}

                <ScheduleAssetButton
                  assetId={asset.id}
                  defaultValue={asset.scheduled_publish_at ?? ""}
                />

                <div className={websiteStyles.actionRow}>
                  <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
                    Open asset →
                  </Link>

                  {asset.status === "approved" ? (
                    <Link href="/publishing-ready" className={websiteStyles.link}>
                      Publishing Ready →
                    </Link>
                  ) : (
                    <Link href="/approvals" className={websiteStyles.link}>
                      Approvals →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No schedulable active assets found yet.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
