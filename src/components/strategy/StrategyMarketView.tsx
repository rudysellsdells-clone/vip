import { AccountMarketProfileManager } from "@/components/accounts/AccountMarketProfileManager";
import styles from "./StrategyMarketView.module.css";

type ServiceLine = {
  id: string;
  name: string;
  short_name?: string | null;
  description?: string | null;
  primary_outcome?: string | null;
};

type Audience = {
  id: string;
  name: string;
  description?: string | null;
  common_pains?: string[] | null;
  desired_outcomes?: string[] | null;
  objections?: string[] | null;
};

type Offer = {
  id: string;
  service_line_id?: string | null;
  name: string;
  description?: string | null;
  offer_type?: string | null;
  primary_cta?: string | null;
  outcome?: string | null;
  price_notes?: string | null;
  target_buyer_segments?: string[] | null;
};

export function StrategyMarketView({
  view,
  accountId,
  canManage,
  serviceLines,
  audiences,
  offers,
}: {
  view: "offerings" | "audiences";
  accountId: string;
  canManage: boolean;
  serviceLines: ServiceLine[];
  audiences: Audience[];
  offers: Offer[];
}) {
  return (
    <div className={view === "offerings" ? styles.offerings : styles.audiences}>
      <AccountMarketProfileManager
        accountId={accountId}
        canManage={canManage}
        serviceLines={serviceLines}
        audiences={audiences}
        offers={offers}
      />
    </div>
  );
}
