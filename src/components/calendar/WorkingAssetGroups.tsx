import { WorkingAssetCard } from "@/components/calendar/WorkingAssetCard";
import { websiteStyles } from "@/components/website-ui/WebsitePage";

export function WorkingAssetGroups({
  groups,
  emptyMessage,
  extraLinks,
}: {
  groups: Array<{
    key: string;
    label: string;
    assets: Array<Record<string, any>>;
  }>;
  emptyMessage: string;
  extraLinks?: (asset: Record<string, any>) => React.ReactNode;
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
                extraLinks={extraLinks ? extraLinks(asset) : null}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
