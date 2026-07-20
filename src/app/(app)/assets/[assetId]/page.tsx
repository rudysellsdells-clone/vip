import Link from "next/link";
import { redirect } from "next/navigation";
import { AssetTitleLink } from "@/components/assets/AssetTitleLink";
import { AssetReviewActions } from "@/components/approvals/AssetReviewActions";
import { RefreshGalaxyAiRunButton } from "@/components/galaxyai/RefreshGalaxyAiRunButton";
import { RunGalaxyAiAssetButton } from "@/components/galaxyai/RunGalaxyAiAssetButton";
import { ExecuteApprovedAssetButton } from "@/components/publishing/ExecuteApprovedAssetButton";
import { RequestRevisionButton } from "@/components/assets/RequestRevisionButton";
import { ManualAssetEditForm } from "@/components/assets/ManualAssetEditForm";
import { VisualAssetPanel } from "@/components/assets/VisualAssetPanel";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getAssetAccessForUser, scopeRelatedAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  params: Promise<{
    assetId: string;
  }>;
};

type VisualAssetRow = {
  id: string;
  title: string | null;
  content: string | null;
  status: string | null;
  asset_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function isCanonicalZapierMcpAsset(assetType: unknown) {
  return ["linkedin_post", "facebook_post", "email"].includes(String(assetType ?? ""));
}

function zapierMcpExecutionLabel(assetType: unknown) {
  if (String(assetType ?? "") === "facebook_post") return "Facebook execution";
  if (String(assetType ?? "") === "linkedin_post") return "LinkedIn execution";
  if (String(assetType ?? "") === "email") return "Gmail draft execution";
  return "ZapierMCP execution";
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function shortText(value: unknown, fallback = "Not supplied") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function firstListItem(value: unknown, fallback = "Not supplied") {
  return Array.isArray(value) && value.length
    ? shortText(value[0], fallback)
    : fallback;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 6)
    : [];
}

function primaryVisualAssetIdFromMetadata(value: unknown) {
  const metadata = metadataRecord(value);
  const text = String(metadata.primaryVisualAssetId ?? "").trim();
  return text || null;
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { assetId } = await params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const assetAccess = await getAssetAccessForUser({ supabase, assetId, userId: user.id });

  if (!assetAccess.asset || !assetAccess.canView) {
    redirect("/approvals");
  }

  const asset = assetAccess.asset;
  const accountId = assetAccess.accountId;

  const { data: campaign } = asset.campaign_id
    ? await scopeRelatedAssetQueryForAccess({
        query: supabase
          .from("campaigns")
          .select("*")
          .eq("id", asset.campaign_id),
        accountId,
        userId: user.id,
      }).maybeSingle()
    : { data: null };

  const { data: childRevisions } = await scopeRelatedAssetQueryForAccess({
    query: supabase
      .from("generated_assets")
      .select("*")
      .eq("parent_asset_id", asset.id)
      .not("asset_type", "in", "(generated_visual,generated_social_image)"),
    accountId,
    userId: user.id,
  }).order("version", { ascending: false });

  const { data: visualAssets } = await scopeRelatedAssetQueryForAccess({
    query: supabase
      .from("generated_assets")
      .select("id,title,content,status,asset_type,metadata,created_at,parent_asset_id")
      .eq("parent_asset_id", asset.id)
      .in("asset_type", ["generated_visual", "generated_social_image"]),
    accountId,
    userId: user.id,
  }).order("created_at", { ascending: false });

  const { data: parentAsset } = asset.parent_asset_id
    ? await scopeRelatedAssetQueryForAccess({
        query: supabase
          .from("generated_assets")
          .select("*")
          .eq("id", asset.parent_asset_id),
        accountId,
        userId: user.id,
      }).maybeSingle()
    : { data: null };

  const { data: approvals } = await supabase
    .from("approvals")
    .select("*")
    .eq("user_id", user.id)
    .eq("asset_id", asset.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const revisions = (childRevisions ?? []) as Array<Record<string, any>>;
  const visualRows = (visualAssets ?? []) as VisualAssetRow[];
  const approvalRows = (approvals ?? []) as Array<Record<string, any>>;
  const primaryVisualAssetId = primaryVisualAssetIdFromMetadata(asset.metadata);
  const assetMetadata = metadataRecord(asset.metadata);
  const campaignMetadata = metadataRecord(campaign?.metadata);
  const marketingSpine = metadataRecord(
    assetMetadata.marketingSpine || campaignMetadata.marketingSpine,
  );
  const assetBrief = metadataRecord(assetMetadata.assetBrief);
  const inheritancePath = stringList(assetMetadata.strategyInheritancePath);
  const channelRoles = metadataRecord(marketingSpine.channelRoles);
  const assetChannelRole = metadataRecord(
    channelRoles[String(assetBrief.channel ?? "")] ?? null,
  );
  const canRevise = asset.status !== "published" && asset.status !== "sent";
  const canExecuteZapierMcp =
    asset.status === "approved" && isCanonicalZapierMcpAsset(asset.asset_type);
  const canRunGalaxyAi =
    asset.status === "approved" &&
    ["galaxyai_prompt", "galaxyai_image_prompt"].includes(String(asset.asset_type));

  const { data: galaxyWorkflows } = canRunGalaxyAi
    ? await supabase
        .from("galaxyai_workflows")
        .select("galaxy_workflow_id,name")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
    : { data: [] };

  const workflows = (galaxyWorkflows ?? []) as Array<{
    galaxy_workflow_id: string;
    name: string;
  }>;

  let galaxyRunsQuery = supabase
    .from("galaxyai_runs")
    .select("id,status,error,created_at,completed_at,galaxy_workflow_id,output")
    .eq("asset_id", asset.id);

  galaxyRunsQuery = accountId
    ? galaxyRunsQuery.eq("account_id", accountId)
    : galaxyRunsQuery.eq("user_id", user.id);

  const { data: galaxyRunsData } = await galaxyRunsQuery
    .order("created_at", { ascending: false })
    .limit(5);
  const galaxyRuns = (galaxyRunsData ?? []) as Array<Record<string, any>>;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Asset Detail"
        title={asset.title ?? "Untitled asset"}
        description={`${asset.asset_type} asset. Review the content, compare revisions, and approve only the version you want to execute.`}
        primaryAction={{ label: "Approval Queue", href: "/approvals" }}
        secondaryAction={
          campaign
            ? { label: "Campaign", href: `/campaigns/${campaign.id}` }
            : { label: "Dashboard", href: "/dashboard" }
        }
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Status"
          value={asset.status}
          description="Current asset decision state."
          dot="gold"
        />
        <WebsiteMetric
          label="Version"
          value={asset.version}
          description="Current version number."
          dot="blue"
        />
        <WebsiteMetric
          label="Revisions"
          value={revisions.length}
          description="Child versions created from this asset."
          dot="purple"
        />
        <WebsiteMetric
          label="Visuals"
          value={visualRows.length}
          description="Generated images attached to this asset."
          dot="green"
        />
      </section>

      <WebsiteSection
        eyebrow="Marketing Spine"
        title="Strategy spine used for this asset"
        description="This shows how the asset inherited strategy before execution. Use it to judge whether the content followed the campaign spine or drifted into generic output."
      >
        {Object.keys(marketingSpine).length ? (
          <div className={websiteStyles.cardGrid}>
            <article className={websiteStyles.card}>
              <div className="flex flex-wrap gap-2">
                <span className={websiteStyles.badge}>Marketing Spine</span>
                <span className={websiteStyles.badge}>{shortText(marketingSpine.gateStatus, "saved")}</span>
                <span className={websiteStyles.badge}>{shortText(marketingSpine.readinessScore, "?")}/100</span>
              </div>
              <h3 className={websiteStyles.cardTitle} style={{ marginTop: 12 }}>
                {shortText(marketingSpine.campaignObjective, "Campaign strategy")}
              </h3>
              <p className={websiteStyles.cardText}>
                <strong>Audience:</strong> {shortText(marketingSpine.audience)}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>Offer:</strong> {shortText(marketingSpine.offer)}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>Originality angle:</strong> {shortText(marketingSpine.originalityAngle)}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>Proof:</strong> {firstListItem(marketingSpine.proofPoints)}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>Objection:</strong> {firstListItem(marketingSpine.objections)}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>CTA:</strong> {shortText(marketingSpine.primaryCta)}
              </p>
            </article>

            <article className={websiteStyles.card}>
              <div className="flex flex-wrap gap-2">
                <span className={websiteStyles.badge}>Asset Brief</span>
                <span className={websiteStyles.badge}>{shortText(assetBrief.channel, "channel")}</span>
              </div>
              <h3 className={websiteStyles.cardTitle} style={{ marginTop: 12 }}>
                {shortText(assetBrief.goal, "Asset goal")}
              </h3>
              <p className={websiteStyles.cardText}>
                <strong>Hook:</strong> {shortText(assetBrief.hook)}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>Key message:</strong> {shortText(assetBrief.keyMessage)}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>Proof point:</strong> {shortText(assetBrief.proofPoint)}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>Objection:</strong> {shortText(assetBrief.objectionToAddress)}
              </p>
              <p className={websiteStyles.cardText}>
                <strong>Channel role:</strong> {shortText(assetChannelRole.role, "Inherited from channel plan")}
              </p>
              {inheritancePath.length ? (
                <p className={websiteStyles.cardMeta}>
                  Inheritance path: {inheritancePath.join(" → ")}
                </p>
              ) : null}
            </article>
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No Marketing Spine metadata found on this asset yet. Generate new monthly content through the visible spine gate to populate this section.
          </div>
        )}
      </WebsiteSection>

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Content"
          title="Asset content"
          description="This is the version currently selected."
        >
          <div className="flex flex-wrap gap-2">
            <WebsiteBadge status={asset.status} />
            <span className={websiteStyles.badge}>Version {asset.version}</span>
            <span className={websiteStyles.badge}>{asset.asset_type}</span>
          </div>

          <pre className={websiteStyles.cardContentBox}>{asset.content}</pre>

          <div className={websiteStyles.cardActions}>
            {assetAccess.canManage && canRevise ? (
              <ManualAssetEditForm
                assetId={asset.id}
                initialTitle={asset.title}
                initialContent={asset.content}
              />
            ) : null}

            <AssetReviewActions assetId={asset.id} />

            {canExecuteZapierMcp ? (
              <ExecuteApprovedAssetButton
                assetId={asset.id}
                assetType={asset.asset_type}
              />
            ) : null}

            {canRunGalaxyAi ? (
              <RunGalaxyAiAssetButton
                assetId={asset.id}
                campaignId={asset.campaign_id ?? ""}
                workflows={workflows}
              />
            ) : null}

            {galaxyRuns.length ? (
              <div className="w-full space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recent GalaxyAI runs
                </p>
                {galaxyRuns.map((run) => (
                  <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {run.galaxy_workflow_id ?? "GalaxyAI workflow"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {String(run.status ?? "queued")} • {formatDate(run.created_at ?? null)}
                      </p>
                      {run.error ? <p className="text-xs font-semibold text-rose-700">{run.error}</p> : null}
                    </div>
                    <RefreshGalaxyAiRunButton runId={run.id} initialStatus={run.status} />
                  </div>
                ))}
              </div>
            ) : null}

            {canRevise ? (
              <RequestRevisionButton assetId={asset.id} assetTitle={asset.title} />
            ) : null}
          </div>
        </WebsiteSection>

        <WebsiteSection
          eyebrow="Context"
          title="Campaign and history"
          description="Use this area to move between parent and child versions."
        >
          {campaign ? (
            <article className={websiteStyles.card}>
              <h3 className={websiteStyles.cardTitle}>{campaign.name}</h3>
              <p className={websiteStyles.cardText}>{campaign.idea}</p>
              <Link href={`/campaigns/${campaign.id}`} className={websiteStyles.link}>
                Open campaign →
              </Link>
            </article>
          ) : null}

          {parentAsset ? (
            <article className={websiteStyles.card} style={{ marginTop: 16 }}>
              <h3 className={websiteStyles.cardTitle}>
                <AssetTitleLink
                  assetId={parentAsset.id}
                  title={parentAsset.title ?? "Parent asset"}
                  className="text-slate-950 underline-offset-4 transition hover:text-[#0b4a7a] hover:underline"
                />
              </h3>
              <p className={websiteStyles.cardMeta}>
                Version {parentAsset.version} • {parentAsset.status}
              </p>
              <Link href={`/assets/${parentAsset.id}`} className={websiteStyles.link}>
                Open parent →
              </Link>
            </article>
          ) : null}

          {canExecuteZapierMcp ? (
            <article className={websiteStyles.card} style={{ marginTop: 16 }}>
              <h3 className={websiteStyles.cardTitle}>{zapierMcpExecutionLabel(asset.asset_type)}</h3>
              <p className={websiteStyles.cardText}>
                This approved social asset can be published through the canonical ZapierMCP route. Facebook and LinkedIn should use this same controlled execution path.
              </p>
            </article>
          ) : null}

          {canRunGalaxyAi ? (
            <article className={websiteStyles.card} style={{ marginTop: 16 }}>
              <h3 className={websiteStyles.cardTitle}>
                {asset.asset_type === "galaxyai_image_prompt"
                  ? "GalaxyAI image generation"
                  : "GalaxyAI media generation"}
              </h3>
              <p className={websiteStyles.cardText}>
                This approved prompt can be sent to a synced GalaxyAI workflow. Image prompts generate social creative for review before attaching the file to a post.
              </p>
            </article>
          ) : null}
        </WebsiteSection>
      </section>

      <VisualAssetPanel
        assetId={asset.id}
        canManage={assetAccess.canManage}
        sourceStatus={asset.status}
        primaryVisualAssetId={primaryVisualAssetId}
        visualAssets={visualRows}
      />

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Versions"
          title="Revision history"
          description="Child versions created from this asset."
        >
          {revisions.length ? (
            <div className={websiteStyles.cardGrid}>
              {revisions.map((revision) => (
                <article key={revision.id} className={websiteStyles.card}>
                  <h3 className={websiteStyles.cardTitle}>
                    <AssetTitleLink
                      assetId={revision.id}
                      title={revision.title ?? "Untitled revision"}
                      className="text-slate-950 underline-offset-4 transition hover:text-[#0b4a7a] hover:underline"
                    />
                  </h3>
                  <p className={websiteStyles.cardMeta}>
                    Version {revision.version} • {formatDate(revision.created_at)}
                  </p>
                  <WebsiteBadge status={revision.status} />
                </article>
              ))}
            </div>
          ) : (
            <div className={websiteStyles.empty}>No child revisions yet.</div>
          )}
        </WebsiteSection>

        <WebsiteSection
          eyebrow="Decisions"
          title="Approval activity"
          description="Recent approval, rejection, or revision records."
        >
          {approvalRows.length ? (
            <div className={websiteStyles.cardGrid}>
              {approvalRows.map((approval) => (
                <article key={approval.id} className={websiteStyles.card}>
                  <WebsiteBadge status={approval.status} />
                  {approval.notes ? <p className={websiteStyles.cardText}>{approval.notes}</p> : null}
                  <p className={websiteStyles.cardMeta}>{formatDate(approval.created_at)}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className={websiteStyles.empty}>No approval records yet.</div>
          )}
        </WebsiteSection>
      </section>
    </WebsitePage>
  );
}