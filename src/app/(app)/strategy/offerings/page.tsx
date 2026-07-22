import { StrategyMarketView } from "@/components/strategy/StrategyMarketView";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
} from "@/components/website-ui/WebsitePage";
import { getStrategyMarketWorkspace } from "@/lib/strategy/get-strategy-market-workspace";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export default async function StrategyOfferingsPage() {
  const workspace = await requireStrategyWorkspace();
  const market = await getStrategyMarketWorkspace({
    supabase: workspace.supabase,
    accountId: workspace.accountId,
  });

  const offersWithCta = market.offers.filter((offer: Record<string, any>) =>
    String(offer.primary_cta ?? "").trim(),
  ).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategy • Offerings"
        title="Define what the business sells and promises."
        description="Manage service lines, offers, outcomes, CTAs, package notes, and audience alignment so campaigns begin with a real commercial decision."
        primaryAction={{ label: "Review Overview", href: "/strategy" }}
        secondaryAction={{ label: "Manage Audiences", href: "/strategy/audiences" }}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WebsiteMetric label="Service Lines" value={market.serviceLines.length} description="Active services available to campaigns." dot={market.serviceLines.length ? "green" : "red"} />
        <WebsiteMetric label="Offers" value={market.offers.length} description="Active offers and packages." dot={market.offers.length ? "green" : "red"} />
        <WebsiteMetric label="Offers With CTA" value={offersWithCta} description="Offers with a clear next action." dot={offersWithCta === market.offers.length && market.offers.length ? "green" : "gold"} />
        <WebsiteMetric label="Edit Access" value={workspace.canManage ? "Enabled" : "View only"} description="Owners and admins can manage offerings." dot={workspace.canManage ? "green" : "gold"} />
      </section>

      <WebsiteSection
        eyebrow="Commercial Strategy"
        title="Services and offers"
        description="Service lines explain the work. Offers define the package, outcome, and call-to-action a campaign can promote."
      >
        <StrategyMarketView
          view="offerings"
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
