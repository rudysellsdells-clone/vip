import Link from "next/link";
import { RemoveAssetButton } from "@/components/assets/RemoveAssetButton";
import { redirect } from "next/navigation";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getAssetAccessForUser } from "@/lib/accounts/asset-access";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type PageProps = {
  params: Promise<{ assetId: string }>;
};

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

export default async function AssetReadOnlyViewPage({ params }: PageProps) {
  const { assetId } = await params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const assetAccess = await getAssetAccessForUser({ supabase, assetId, userId: user.id });
  const asset = assetAccess.asset;

  if (!asset || !assetAccess.canView) {
    return (
      <WebsitePage>
        <WebsiteHero
          eyebrow="Asset"
          title="Asset not found"
          description="The selected asset could not be loaded."
        />
      </WebsitePage>
    );
  }

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Asset View"
        title={asset.title ?? "Untitled asset"}
        description="Read-only asset view. Use this when you want to inspect the content without landing on a revision/request screen."
        primaryAction={{ label: "Publishing Schedule", href: "/publishing-schedule" }}
        secondaryAction={{ label: "Approvals", href: "/approvals" }}
      />

      <WebsiteSection
        eyebrow="Details"
        title="Asset status"
        description="This shows the working lifecycle state for this content item."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <div className="flex flex-wrap gap-2">
              <WebsiteBadge status={asset.status ?? "needs_review"} />
              <span className={websiteStyles.badge}>{String(asset.asset_type ?? "asset").replaceAll("_", " ")}</span>
              <span className={websiteStyles.badge}>
                Quality: {String(asset.quality_workflow_status ?? "not_checked").replaceAll("_", " ")}
              </span>
            </div>

            <p className={websiteStyles.cardMeta} style={{ marginTop: 12 }}>
              Scheduled: {dateLabel(asset.scheduled_publish_at ?? asset.planned_publish_date)}
            </p>

            <p className={websiteStyles.cardMeta}>
              Version: {asset.version ?? 1} · Active: {asset.is_active_version === false ? "No" : "Yes"}
            </p>
          </article>
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Content"
        title="Asset content"
        description="This is the content that will be sent downstream."
      >
        <article className={websiteStyles.card}>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
            {asset.content ?? "No content found."}
          </pre>
        </article>

        <div className={websiteStyles.actionRow}>
          <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
            Open full asset page →
          </Link>
          <RemoveAssetButton assetId={asset.id} assetTitle={asset.title} compact />
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}