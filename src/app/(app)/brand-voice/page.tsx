import { redirect } from "next/navigation";
import { BrandRuleForm } from "@/components/clone/BrandRuleForm";
import { DigitalCloneProfileForm } from "@/components/clone/DigitalCloneProfileForm";
import {
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { getActiveWorkspaceForUser } from "@/lib/accounts/active-workspace";
import { DEFAULT_DIGITAL_CLONE_PROFILE } from "@/lib/clone/defaults";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export default async function BrandVoicePage() {
  const supabase = untypedSupabase(await createClient());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

  if (!workspace) redirect("/accounts");

  const activeWorkspace = workspace!;

  const { data: profile } = await supabase
    .from("digital_clone_profiles")
    .select("*")
    .eq("account_id", activeWorkspace.activeAccountId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: brandRules } = await supabase
    .from("brand_rules")
    .select("*")
    .eq("account_id", activeWorkspace.activeAccountId)
    .eq("active", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  const workingProfile = profile ?? { ...DEFAULT_DIGITAL_CLONE_PROFILE };
  const rules = (brandRules ?? []) as Array<Record<string, any>>;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow={`Business Memory • ${activeWorkspace.activeAccountName}`}
        title="Shape how VIP thinks and writes."
        description="Manage the brand voice, positioning, rules, and guardrails for the active workspace so VIP sounds specific instead of generic."
        primaryAction={{ label: "Knowledge Library", href: "/knowledge" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Clone Profile" value={profile ? "Active" : "Default"} description="The core voice and positioning layer." dot={profile ? "green" : "gold"} />
        <WebsiteMetric label="Brand Rules" value={rules.length} description="Voice and behavior guardrails." dot="blue" />
        <WebsiteMetric label="Safety Mode" value="On" description="External actions require approval." dot="green" />
        <WebsiteMetric label="Next Step" value="Refine" description="Add rules and examples over time." dot="purple" />
      </section>

      <div className={websiteStyles.formFrame}>
        <DigitalCloneProfileForm profile={workingProfile} />
      </div>

      <WebsiteSection
        eyebrow="Rules"
        title="Brand rules"
        description="Use rules to keep VIP clear, human, revenue-focused, and safe."
      >
        <div className={websiteStyles.cardGrid}>
          {rules.length ? (
            rules.map((rule) => (
              <article key={rule.id} className={websiteStyles.card}>
                <p className={websiteStyles.sectionEyebrow}>{rule.category}</p>
                <h3 className={websiteStyles.cardTitle}>Priority {rule.priority}</h3>
                <p className={websiteStyles.cardText}>{rule.rule_text}</p>
              </article>
            ))
          ) : (
            <div className={websiteStyles.empty}>No brand rules yet for this workspace. Add a few rules below.</div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <BrandRuleForm />
        </div>
      </WebsiteSection>
    </WebsitePage>
  );
}
