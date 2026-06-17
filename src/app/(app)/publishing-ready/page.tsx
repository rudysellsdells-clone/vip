import { redirect } from "next/navigation";
import { SendAssetToZapierMcpButton } from "@/components/publishing/SendAssetToZapierMcpButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getAssetAccessForUser } from "@/lib/accounts/asset-access";
import {
  loadAccountPublishingSettings,
  type AccountPublishingSettingsResolution,
} from "@/lib/accounts/account-publishing-settings";
import {
  buildPublishingOutputParams,
  isApprovedForPublishing,
  missingZapierMcpConfigMessage,
  zapierMcpConfigForAsset,
} from "@/lib/publishing/output-payload";
import { buildPublishingPreflightReport } from "@/lib/publishing/publishing-preflight";
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

function publishingResolution(accountId: string | null): AccountPublishingSettingsResolution {
  return {
    source: accountId ? "asset.account_id" : "legacy_user_asset",
    accountId,
    candidateAccountIds: accountId ? [accountId] : [],
    found: Boolean(accountId),
  };
}

function compactJson(value: unknown) {
  return JSON.stringify(value, null, 2);
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

  const assetAccess = await getAssetAccessForUser({
    supabase,
    assetId,
    userId: user.id,
  });

  if (!assetAccess.asset || !assetAccess.canView) {
    return (
      <WebsitePage>
        <WebsiteHero
          eyebrow="Publish Center"
          title="Asset not found"
          description="The selected asset could not be loaded for your current workspace. Return to Publish Center and choose another approved asset."
          primaryAction={{ label: "Publish Center", href: "/publishing-schedule" }}
        />
      </WebsitePage>
    );
  }

  const accountSettings = await loadAccountPublishingSettings({
    supabase,
    accountId: assetAccess.accountId,
  });
  const asset = {
    ...assetAccess.asset,
    account_publishing_settings: accountSettings,
    account_publishing_settings_resolution: publishingResolution(assetAccess.accountId),
  };

  const alreadySentOrPublished = isAlreadySentOrPublished(asset);
  const approvedForPublishing = isApprovedForPublishing(asset);
  const config = zapierMcpConfigForAsset(asset);
  const params = buildPublishingOutputParams(asset);
  const actionLabel = publishingActionLabel(asset);
  const preflight = buildPublishingPreflightReport({
    asset,
    config,
    settings: accountSettings,
    canManage: assetAccess.canManage,
  });
  const canExecuteNow = approvedForPublishing && !alreadySentOrPublished && preflight.ready;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Publish Center"
        title={asset.title ?? "Untitled asset"}
        description="This is the safe preflight step for an approved asset. Review the active workspace, destination settings, and exact payload before any live provider execution."
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
              Workspace ID: {assetAccess.accountId ?? "Legacy user asset"} · Scheduled: {dateLabel(asset.scheduled_publish_at ?? asset.planned_publish_date)}
            </p>

            <p className={websiteStyles.cardMeta}>
              Destination: {preflight.destinationLabel}
            </p>

            <p className={websiteStyles.cardMeta}>
              ZapierMCP app: {config.app || "Not configured"} · action: {config.action || "Not configured"} · settings: {preflight.accountSettingsFound ? "workspace settings found" : "missing"}
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
        eyebrow="Preflight"
        title={preflight.ready ? "Ready for controlled execution" : "Execution blocked until this workspace is ready"}
        description="H1.4D3A lets you review exactly what VIP would send without needing a second external Zapier, Facebook, LinkedIn, WordPress, or GalaxyAI stack."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Workspace + destination check</h3>
            <p className={websiteStyles.cardText}>
              {preflight.ready
                ? "The asset, workspace role, ZapierMCP app/action, and account destination settings are present."
                : "VIP will not show the live execution button until these blockers are resolved."}
            </p>

            {preflight.blockers.length ? (
              <ul className={websiteStyles.cardText}>
                {preflight.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : null}

            {preflight.warnings.length ? (
              <div style={{ marginTop: 12 }}>
                <p className={websiteStyles.cardMeta}>Warnings / review notes:</p>
                <ul className={websiteStyles.cardText}>
                  {preflight.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!config.app || !config.action ? (
              <p className={websiteStyles.cardMeta}>{missingZapierMcpConfigMessage(asset)}</p>
            ) : null}
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Workspace publishing settings</h3>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 12, fontSize: 12 }}>
              {compactJson({
                account_id: assetAccess.accountId,
                settings_found: Boolean(accountSettings),
                linkedin_page_name: accountSettings?.linkedin_page_name ?? null,
                linkedin_company_id: accountSettings?.linkedin_company_id ?? null,
                facebook_page_name: accountSettings?.facebook_page_name ?? null,
                facebook_page_id: accountSettings?.facebook_page_id ?? null,
                primary_booking_url: accountSettings?.primary_booking_url ?? null,
                galaxyai_style: accountSettings?.galaxyai_style ?? null,
              })}
            </pre>
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Execute"
        title={actionLabel}
        description="Live execution stays hidden unless preflight confirms this asset belongs to the current workspace and the destination settings are present."
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
        ) : canExecuteNow ? (
          <article className={websiteStyles.card}>
            <SendAssetToZapierMcpButton assetId={String(asset.id)} label={actionLabel} />
          </article>
        ) : (
          <div className={websiteStyles.empty}>
            This asset is not ready to send yet. It must be approved, active, latest-version, manageable by your role, and pass workspace destination preflight.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Payload"
        title="Payload preview"
        description="This confirms the structured params object VIP would send to the configured publishing provider."
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