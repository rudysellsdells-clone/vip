import { redirect } from "next/navigation";
import { SendAssetToZapierMcpButton } from "@/components/publishing/SendAssetToZapierMcpButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import {
  buildPublishingOutputParams,
  isApprovedForPublishing,
  zapierMcpConfigForAsset,
} from "@/lib/publishing/output-payload";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateLabel(value: unknown) {
  if (!value) return "No date";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isAlreadySentOrPublished(asset: Record<string, any>) {
  return (
    Boolean(asset.published_at) ||
    String(asset.status ?? "") === "published" ||
    String(asset.status ?? "") === "sent_to_zapier" ||
    String(asset.scheduling_status ?? "") === "published" ||
    String(asset.scheduling_status ?? "") === "sent_to_zapier"
  );
}

function publishingActionLabel(asset: Record<string, any>) {
  const text = [
    asset.asset_type,
    asset.channel,
    asset.destination,
    asset.platform,
    asset.title,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");

  if (text.includes("wordpress") || text.includes("blog") || text.includes("article")) {
    return "Publish blog post";
  }

  if (text.includes("email") || text.includes("gmail")) return "Create email draft";
  if (text.includes("facebook")) return "Publish to Facebook";
  if (text.includes("linkedin")) return "Publish to LinkedIn";

  return "Publish / send asset";
}

export default async function PublishingReadyPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const assetId = firstValue(resolvedSearchParams.asset);

  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!assetId) {
    return (
      <WebsitePage>
        <WebsiteHero
          eyebrow="Publish Center"
          title="Select an item from Publish Center"
          description="Open this asset-specific execution step from Publish Center. Approved assets appear there when they are ready to send."
          primaryAction={{ label: "Publish Center", href: "/publishing-schedule" }}
        />
      </WebsitePage>
    );
  }

  const { data: asset, error } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .single();

  if (error || !asset) {
    return (
      <WebsitePage>
        <WebsiteHero
          eyebrow="Publish Center"
          title="Asset not found"
          description="The selected asset could not be loaded. Return to Publish Center and choose another approved asset."
          primaryAction={{ label: "Publish Center", href: "/publishing-schedule" }}
        />
      </WebsitePage>
    );
  }

  const alreadySentOrPublished = isAlreadySentOrPublished(asset);
  const approvedForPublishing = isApprovedForPublishing(asset);
  const config = zapierMcpConfigForAsset(asset);
  const params = buildPublishingOutputParams(asset);
  const actionLabel = publishingActionLabel(asset);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publish Center"
        title={asset.title ?? "Untitled asset"}
        description="This is the controlled execution step for an approved asset. VIP sends the structured payload to the configured publishing destination and then records provider evidence."
        primaryAction={{ label: "Publish Center", href: "/publishing-schedule" }}
        secondaryAction={{ label: "Action History", href: "/actions" }}
      />

      <WebsiteSection
        eyebrow="Asset"
        title="Output status"
        description="Only approved, active, latest-version assets should be sent."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <div className="flex flex-wrap gap-2">
              <WebsiteBadge status={asset.status ?? "needs_review"} />
              <span className={websiteStyles.badge}>{String(asset.asset_type ?? "asset").replaceAll("_", " ")}</span>
              <span className={websiteStyles.badge}>
                Quality: {String(asset.quality_workflow_status ?? "not_checked").replaceAll("_", " ")}
              </span>
              <span className={websiteStyles.badge}>
                {alreadySentOrPublished
                  ? "Already sent/published"
                  : approvedForPublishing
                    ? "Eligible to send"
                    : "Not eligible"}
              </span>
            </div>

            <p className={websiteStyles.cardMeta} style={{ marginTop: 12 }}>
              Scheduled: {dateLabel(asset.scheduled_publish_at ?? asset.planned_publish_date)}
            </p>

            <p className={websiteStyles.cardMeta}>
              ZapierMCP app: {config.app || "Not configured"} · action: {config.action || "Not configured"}
            </p>
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Content"
        title="Content to send"
        description="This is the asset content that will be passed through ZapierMCP."
      >
        <article className={websiteStyles.card}>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
            {asset.content ?? "No content found."}
          </pre>
        </article>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Execute"
        title={actionLabel}
        description="This sends the structured VIP output payload to the configured publishing action. The button label reflects the content destination, while ZapierMCP remains the execution provider behind the scenes."
      >
        {alreadySentOrPublished ? (
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Already sent or published</h3>
            <p className={websiteStyles.cardText}>
              VIP has this asset marked as sent or published. This is not a failure state. Reset or duplicate the asset before retesting to avoid posting the same content twice.
            </p>
            <p className={websiteStyles.cardMeta}>
              Status: {String(asset.status ?? "unknown")} · Scheduling: {String(asset.scheduling_status ?? "unknown")}
            </p>
          </article>
        ) : approvedForPublishing ? (
          <article className={websiteStyles.card}>
            <SendAssetToZapierMcpButton assetId={String(asset.id)} label={actionLabel} />
          </article>
        ) : (
          <div className={websiteStyles.empty}>
            This asset is not ready to send yet. It must be approved, active, and the latest version.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Payload"
        title="Payload preview"
        description="This confirms the structured params object that will be sent to the configured publishing provider."
      >
        <details className={websiteStyles.card}>
          <summary className={websiteStyles.cardTitle}>View params</summary>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 12, fontSize: 12 }}>
            {JSON.stringify(params, null, 2)}
          </pre>
        </details>
      </WebsiteSection>
    </WebsitePage>
  );
}