import { redirect } from "next/navigation";
import { SeedCommercialFoundationButton } from "@/components/setup/SeedCommercialFoundationButton";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { createClient } from "@/lib/supabase/server";
import { getLinkedInCompanyPageName, getLinkedInOrganizationId } from "@/lib/zapier/linkedin";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [serviceLinesResult, buyerSegmentsResult, offersResult, linkedinPolicyResult] = await Promise.all([
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

    supabase
      .from("zapier_action_policies")
      .select("id")
      .eq("user_id", user.id)
      .eq("app_name", "LinkedIn")
      .eq("action_name", "create_company_update")
      .eq("active", true),
  ]);

  const serviceLineCount = serviceLinesResult.data?.length ?? 0;
  const buyerSegmentCount = buyerSegmentsResult.data?.length ?? 0;
  const offerCount = offersResult.data?.length ?? 0;
  const linkedinPolicyCount = linkedinPolicyResult.data?.length ?? 0;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Settings"
        title="Set up VIP's commercial and publishing foundation."
        description="Populate the campaign dropdowns and confirm the external publishing targets VIP should prepare actions for."
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
          label="LinkedIn Policy"
          value={linkedinPolicyCount ? "Ready" : "Auto-created"}
          description="Created when the first LinkedIn post is prepared."
          dot={linkedinPolicyCount ? "green" : "purple"}
        />
      </section>

      <WebsiteSection
        eyebrow="Commercial Foundation"
        title="Populate campaign dropdowns"
        description="This safely inserts Rudy's approved service lines, buyer segments, and offers. It checks existing names first, so clicking it again will not duplicate records."
      >
        <SeedCommercialFoundationButton />
      </WebsiteSection>

      <WebsiteSection
        eyebrow="LinkedIn Publishing"
        title="LinkedIn company page target"
        description="Approved LinkedIn post assets will prepare Zapier MCP actions for this company page only."
      >
        <div className={websiteStyles.cardGrid}>
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Company page</h3>
            <p className={websiteStyles.cardText}>{getLinkedInCompanyPageName()}</p>
          </article>

          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>Organization ID</h3>
            <p className={websiteStyles.cardText}>
              {getLinkedInOrganizationId() ?? "Not configured. Page name will be passed to Zapier."}
            </p>
          </article>
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
