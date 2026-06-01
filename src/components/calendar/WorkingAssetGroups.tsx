import type { ReactNode } from "react";
import { WorkingAssetCard } from "@/components/calendar/WorkingAssetCard";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function WorkingAssetGroups({
  groups,
  emptyMessage,
  reviewsByAssetId,
  showQuality = true,
  compactQuality = true,
  extraLinks,
}: {
  groups: Array<{
    key: string;
    label: string;
    assets: Array<Record<string, any>>;
  }>;
  emptyMessage: string;
  reviewsByAssetId?: Map<string, Record<string, any>>;
  showQuality?: boolean;
  compactQuality?: boolean;
  extraLinks?: (asset: Record<string, any>) => ReactNode;
}) {
  if (!groups.length) {
    return <div className={websiteStyles.empty}>{emptyMessage}</div>;
  }

  return (
    <div className="grid gap-5">
      {groups.map((group) => (
        <section key={group.key} className={websiteStyles.card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={websiteStyles.cardTitle}>{group.label}</h3>
            <span className={websiteStyles.badge}>{group.assets.length} item(s)</span>
          </div>

          <div className={websiteStyles.cardGrid} style={{ marginTop: 16 }}>
            {group.assets.map((asset) => (
              <WorkingAssetCard
                key={asset.id}
                asset={asset}
                review={reviewsByAssetId?.get(String(asset.id)) ?? null}
                showQuality={showQuality}
                compactQuality={compactQuality}
                extraLinks={extraLinks ? extraLinks(asset) : null}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
