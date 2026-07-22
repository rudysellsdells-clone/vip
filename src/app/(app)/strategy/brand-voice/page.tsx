import { DigitalCloneProfileForm } from "@/components/clone/DigitalCloneProfileForm";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { DEFAULT_DIGITAL_CLONE_PROFILE } from "@/lib/clone/defaults";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export default async function StrategyBrandVoicePage() {
  const workspace = await requireStrategyWorkspace();
  const { data: profile } = await workspace.supabase
    .from("digital_clone_profiles")
    .select("*")
    .eq("account_id", workspace.accountId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const workingProfile = profile ?? { ...DEFAULT_DIGITAL_CLONE_PROFILE };
  const completed = [
    workingProfile.voice_summary,
    workingProfile.business_summary,
    workingProfile.audience_summary,
    workingProfile.offer_summary,
    workingProfile.sales_outcome_summary,
  ].filter((value) => String(value ?? "").trim()).length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategy • Brand Voice"
        title="Shape how VIP thinks before it writes."
        description="Define the active workspace voice, business framing, audience understanding, offer summary, and desired sales outcomes used by strategy and generation."
        primaryAction={{ label: "Review Overview", href: "/strategy" }}
        secondaryAction={{ label: "Manage Brand Rules", href: "/strategy/brand-rules" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Profile Status" value={profile ? "Active" : "Default"} description="Whether a saved digital clone profile exists." dot={profile ? "green" : "gold"} />
        <WebsiteMetric label="Voice Fields" value={`${completed}/5`} description="Voice, business, audience, offer, and outcomes." dot={completed === 5 ? "green" : "gold"} />
        <WebsiteMetric label="Workspace" value={workspace.accountName} description="The account this voice applies to." dot="blue" />
        <WebsiteMetric label="Edit Access" value={workspace.canManage ? "Enabled" : "View only"} description="Owners and admins can refine the clone profile." dot={workspace.canManage ? "green" : "gold"} />
      </section>

      <WebsiteSection
        eyebrow="Brand Expression"
        title="Digital clone profile"
        description="This is private strategy memory. VIP should translate it into natural audience-facing language rather than copying these fields verbatim."
      >
        {workspace.canManage ? (
          <div className={websiteStyles.formFrame}>
            <DigitalCloneProfileForm profile={workingProfile} />
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            You can review this Strategy workspace, but only account owners and administrators can edit Brand Voice.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
