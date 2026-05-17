import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SeedCommercialFoundationButton } from "@/components/setup/SeedCommercialFoundationButton";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [serviceLinesResult, buyerSegmentsResult, offersResult] = await Promise.all([
    supabase
      .from("service_lines")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true),

    supabase
      .from("buyer_segments")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true),

    supabase
      .from("offers")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true),
  ]);

  const serviceLineCount = serviceLinesResult.data?.length ?? 0;
  const buyerSegmentCount = buyerSegmentsResult.data?.length ?? 0;
  const offerCount = offersResult.data?.length ?? 0;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Settings"
        title="Set up VIP's commercial foundation."
        description="Populate the service lines, buyer segments, and offers that power campaign dropdowns and clone context."
        primaryAction={{ label: "Create Campaign", href: "/campaigns" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Service Lines"
          value={serviceLineCount}
          description="Services Rudy sells."
          dot="blue"
        />
        <WebsiteMetric
          label="Buyer Segments"
          value={buyerSegmentCount}
          description="Best-fit target buyers."
          dot="gold"
        />
        <WebsiteMetric
          label="Offers"
          value={offerCount}
          description="Productized service offers."
          dot="green"
        />
        <WebsiteMetric
          label="Campaign Inputs"
          value={buyerSegmentCount && offerCount ? "Ready" : "Needs Setup"}
          description="Dropdown data for campaign creation."
          dot={buyerSegmentCount && offerCount ? "green" : "red"}
        />
      </section>

      <WebsiteSection
        eyebrow="Commercial Foundation"
        title="Populate campaign dropdowns"
        description="This safely inserts Rudy's approved service lines, buyer segments, and offers. It checks existing names first, so clicking it again will not duplicate records."
      >
        <SeedCommercialFoundationButton />
      </WebsiteSection>
    </WebsitePage>
  );
}
