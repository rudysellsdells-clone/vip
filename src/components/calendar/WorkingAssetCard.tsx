import type { ReactNode } from "react";
import Link from "next/link";
import { RemoveAssetButton } from "@/components/assets/RemoveAssetButton";
import { QualityScorePanel } from "@/components/content-quality/QualityScorePanel";
import { WebsiteBadge, websiteStyles } from "@/components/website-ui/WebsitePage";
import { dateTimeLabel } from "@/lib/calendar/view-range";

function assetTypeLabel(value: unknown) {
  return String(value ?? "asset").replaceAll("_", " ");
}

function preview(content: unknown, length = 180) {
  const text = String(content ?? "").replace(/\s+/g, " ").trim();

  if (!text) return "No content preview available.";

  return `${text.slice(0, length)}${text.length > length ? "..." : ""}`;
}

export function WorkingAssetCard({
  asset,
  review = null,
  showQuality = true,
  compactQuality = true,
  extraLinks = null,
}: {
  asset: Record<string, any>;
  review?: Record<string, any> | null;
  showQuality?: boolean;
  compactQuality?: boolean;
  extraLinks?: ReactNode;
}) {
  const date =
    asset.scheduled_publish_at ??
    asset.planned_publish_date ??
    asset.campaign_week_start_date ??
    asset.created_at;

  return (
    <article className={websiteStyles.card}>
      <div className="flex flex-wrap gap-2">
        <WebsiteBadge status={asset.status ?? "needs_review"} />
        <span className={websiteStyles.badge}>{assetTypeLabel(asset.asset_type)}</span>
        <span className={websiteStyles.badge}>{dateTimeLabel(date)}</span>
        {asset.quality_workflow_status ? (
          <span className={websiteStyles.badge}>
            Quality: {String(asset.quality_workflow_status).replaceAll("_", " ")}
          </span>
        ) : null}
      </div>

      <h4 className={websiteStyles.cardTitle} style={{ marginTop: 14, fontSize: 16 }}>
        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
          {asset.title}
        </Link>
      </h4>

      <p className={websiteStyles.cardText}>{preview(asset.content)}</p>

      {showQuality ? (
        <QualityScorePanel asset={asset} review={review} compact={compactQuality} />
      ) : null}

      <div className={websiteStyles.actionRow} style={{ marginTop: 14 }}>
        <Link href={`/assets/${asset.id}`} className={websiteStyles.link}>
          Open →
        </Link>
        {extraLinks}
        <RemoveAssetButton assetId={String(asset.id)} assetTitle={asset.title} compact />
      </div>
    </article>
  );
}
