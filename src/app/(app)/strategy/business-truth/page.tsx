import { AccountBrandProfileForm } from "@/components/accounts/AccountBrandProfileForm";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export default async function StrategyBusinessTruthPage() {
  const workspace = await requireStrategyWorkspace();
  const [{ data: account }, { data: brandProfile }] = await Promise.all([
    workspace.supabase
      .from("accounts")
      .select("id,name,website_url,primary_cta,status")
      .eq("id", workspace.accountId)
      .maybeSingle(),
    workspace.supabase
      .from("account_brand_profiles")
      .select("*")
      .eq("account_id", workspace.accountId)
      .maybeSingle(),
  ]);

  const profile = (brandProfile ?? null) as Record<string, any> | null;
  const completed = [
    profile?.company_name ?? account?.name,
    profile?.website_url ?? account?.website_url,
    profile?.primary_cta ?? account?.primary_cta,
    profile?.phone,
    profile?.service_areas,
  ].filter((value) => String(value ?? "").trim()).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategy • Business Truth"
        title="Define the durable facts VIP should trust."
        description="Manage the company identity, website, CTA, phone, geography, logo, and account-level business context that every campaign should inherit."
        primaryAction={{ label: "Review Overview", href: "/strategy" }}
        secondaryAction={{ label: "Manage Offerings", href: "/strategy/offerings" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Core Facts" value={`${completed}/5`} description="Company, website, CTA, phone, and service areas." dot={completed === 5 ? "green" : "gold"} />
        <WebsiteMetric label="Logo" value={profile?.logo_url ? "Saved" : "Missing"} description="Current account logo availability." dot={profile?.logo_url ? "green" : "gold"} />
        <WebsiteMetric label="Brand Colors" value={Array.isArray(profile?.brand_colors) ? profile.brand_colors.length : 0} description="Saved visual identity colors." dot="blue" />
        <WebsiteMetric label="Edit Access" value={workspace.canManage ? "Enabled" : "View only"} description="Owners and admins can update business truth." dot={workspace.canManage ? "green" : "gold"} />
      </section>

      <WebsiteSection
        eyebrow="Business-Owned Source"
        title="Account brand profile"
        description="These fields remain owned by the business. Research and campaign prompts may use them, but should never silently replace them."
      >
        {workspace.canManage ? (
          <div className={websiteStyles.formFrame}>
            <AccountBrandProfileForm
              accountId={workspace.accountId}
              profile={profile}
            />
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            You can review this Strategy workspace, but only account owners and administrators can edit Business Truth.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
