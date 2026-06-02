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
          eyebrow="Publishing Ready"
          title="Select an asset to send"
          description="Open this page from the publishing schedule using a specific asset."
          primaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
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
          eyebrow="Publishing Ready"
          title="Asset not found"
          description="The selected asset could not be loaded."
          primaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
        />
      </WebsitePage>
    );
  }

  const approvedForPublishing = isApprovedForPublishing(asset);
  const config = zapierMcpConfigForAsset(asset);
  const params = buildPublishingOutputParams(asset);

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publishing Ready"
        title={asset.title ?? "Untitled asset"}
        description="This is the controlled execution screen for sending approved VIP outputs to ZapierMCP."
        primaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
        secondaryAction={{ label: "Published", href: "/published" }}
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
                {approvedForPublishing ? "Eligible to send" : "Not eligible"}
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
        title="Send to ZapierMCP"
        description="This sends the structured VIP output payload to the configured ZapierMCP action."
      >
        {approvedForPublishing ? (
          <article className={websiteStyles.card}>
            <SendAssetToZapierMcpButton assetId={String(asset.id)} />
          </article>
        ) : (
          <div className={websiteStyles.empty}>
            This asset is not approved, active, and latest-version. It cannot be sent yet.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Payload"
        title="Payload preview"
        description="This confirms that ZapierMCP will receive a params object, not undefined."
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
