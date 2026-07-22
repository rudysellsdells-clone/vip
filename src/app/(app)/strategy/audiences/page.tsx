import { StrategyMarketView } from "@/components/strategy/StrategyMarketView";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
} from "@/components/website-ui/WebsitePage";
import { getStrategyMarketWorkspace } from "@/lib/strategy/get-strategy-market-workspace";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export default async function StrategyAudiencesPage() {
  const workspace = await requireStrategyWorkspace();
  const market = await getStrategyMarketWorkspace({
    supabase: workspace.supabase,
    accountId: workspace.accountId,
  });

  const withPains = market.audiences.filter(
    (audience: Record<string, any>) =>
      Array.isArray(audience.common_pains) && audience.common_pains.length > 0,
  ).length;
  const withOutcomes = market.audiences.filter(
    (audience: Record<string, any>) =>
      Array.isArray(audience.desired_outcomes) &&
      audience.desired_outcomes.length > 0,
  ).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategy • Audiences"
        title="Define the people every campaign must understand."
        description="Manage buyer groups, decision context, pain points, desired outcomes, and objections so VIP writes for the real customer rather than a generic market."
        primaryAction={{ label: "Review Overview", href: "/strategy" }}
        secondaryAction={{ label: "Manage Offerings", href: "/strategy/offerings" }}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WebsiteMetric label="Audiences" value={market.audiences.length} description="Active buyer groups available to campaigns." dot={market.audiences.length ? "green" : "red"} />
        <WebsiteMetric label="Pain Context" value={withPains} description="Audiences with defined pain points." dot={withPains === market.audiences.length && market.audiences.length ? "green" : "gold"} />
        <WebsiteMetric label="Desired Outcomes" value={withOutcomes} description="Audiences with explicit desired results." dot={withOutcomes === market.audiences.length && market.audiences.length ? "green" : "gold"} />
        <WebsiteMetric label="Edit Access" value={workspace.canManage ? "Enabled" : "View only"} description="Owners and admins can manage audiences." dot={workspace.canManage ? "green" : "gold"} />
      </section>

      <WebsiteSection
        eyebrow="Audience Strategy"
        title="Buyer groups and decision context"
        description="Each audience should describe one recognizable decision-maker or buyer group, not a broad collection of unrelated people."
      >
        <StrategyMarketView
          view="audiences"
          accountId={workspace.accountId}
          canManage={workspace.canManage}
          serviceLines={market.serviceLines}
          audiences={market.audiences}
          offers={market.offers}
        />
      </WebsiteSection>
    </WebsitePage>
  );
}
