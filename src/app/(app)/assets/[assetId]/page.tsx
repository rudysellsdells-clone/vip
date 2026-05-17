import Link from "next/link";
import { redirect } from "next/navigation";
import { AssetReviewActions } from "@/components/approvals/AssetReviewActions";
import { PrepareLinkedInPostButton } from "@/components/assets/PrepareLinkedInPostButton";
import { RequestRevisionButton } from "@/components/assets/RequestRevisionButton";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { createClient } from "@/lib/supabase/server";
import { isLinkedInAsset } from "@/lib/zapier/linkedin";

type PageProps = {
  params: Promise<{
    assetId: string;
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

export default async function AssetDetailPage({ params }: PageProps) {
  const { assetId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: asset, error: assetError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .single();

  if (assetError || !asset) {
    redirect("/approvals");
  }

  const { data: campaign } = asset.campaign_id
    ? await supabase
        .from("campaigns")
        .select("*")
        .eq("id", asset.campaign_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: childRevisions } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("parent_asset_id", asset.id)
    .order("version", { ascending: false });

  const { data: parentAsset } = asset.parent_asset_id
    ? await supabase
        .from("generated_assets")
        .select("*")
        .eq("id", asset.parent_asset_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: approvals } = await supabase
    .from("approvals")
    .select("*")
    .eq("user_id", user.id)
    .eq("asset_id", asset.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const revisions = (childRevisions ?? []) as Array<Record<string, any>>;
  const approvalRows = (approvals ?? []) as Array<Record<string, any>>;
  const canRevise = asset.status !== "published" && asset.status !== "sent";
  const canPrepareLinkedIn = asset.status === "approved" && isLinkedInAsset(asset.asset_type, asset.title);

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
          label="Activity"
          value={approvalRows.length}
          description="Approval records for this asset."
          dot="green"
        />
      </section>

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
            <AssetReviewActions assetId={asset.id} />

            {canPrepareLinkedIn ? (
              <PrepareLinkedInPostButton assetId={asset.id} />
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
              <h3 className={websiteStyles.cardTitle}>Parent asset</h3>
              <p className={websiteStyles.cardMeta}>
                Version {parentAsset.version} • {parentAsset.status}
              </p>
              <Link href={`/assets/${parentAsset.id}`} className={websiteStyles.link}>
                Open parent →
              </Link>
            </article>
          ) : null}

          {canPrepareLinkedIn ? (
            <article className={websiteStyles.card} style={{ marginTop: 16 }}>
              <h3 className={websiteStyles.cardTitle}>LinkedIn execution</h3>
              <p className={websiteStyles.cardText}>
                This approved LinkedIn asset can be prepared as a Zapier MCP action for the McCormick Web Marketing LinkedIn company page.
              </p>
            </article>
          ) : null}
        </WebsiteSection>
      </section>

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Versions"
          title="Revision history"
          description="Child versions created from this asset."
        >
          {revisions.length ? (
            <div className={websiteStyles.cardGrid}>
              {revisions.map((revision) => (
                <Link key={revision.id} href={`/assets/${revision.id}`} className={websiteStyles.card}>
                  <h3 className={websiteStyles.cardTitle}>{revision.title ?? "Untitled revision"}</h3>
                  <p className={websiteStyles.cardMeta}>
                    Version {revision.version} • {formatDate(revision.created_at)}
                  </p>
                  <WebsiteBadge status={revision.status} />
                </Link>
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
