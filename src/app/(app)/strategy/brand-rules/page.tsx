import { BrandRuleForm } from "@/components/clone/BrandRuleForm";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export default async function StrategyBrandRulesPage() {
  const workspace = await requireStrategyWorkspace();
  const { data: brandRules } = await workspace.supabase
    .from("brand_rules")
    .select("*")
    .eq("account_id", workspace.accountId)
    .eq("active", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  const rules = (brandRules ?? []) as Array<Record<string, any>>;
  const categories = new Set(
    rules.map((rule) => String(rule.category ?? "general").trim()).filter(Boolean),
  );

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategy • Brand Rules"
        title="Set the guardrails every output must follow."
        description="Manage active voice, style, positioning, compliance, and behavior rules for the selected workspace."
        primaryAction={{ label: "Review Overview", href: "/strategy" }}
        secondaryAction={{ label: "Manage Brand Voice", href: "/strategy/brand-voice" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric label="Active Rules" value={rules.length} description="Current generation and review guardrails." dot={rules.length ? "green" : "gold"} />
        <WebsiteMetric label="Categories" value={categories.size} description="Distinct rule categories represented." dot="blue" />
        <WebsiteMetric label="Highest Priority" value={rules[0]?.priority ?? "None"} description="First rule VIP should consider." dot="purple" />
        <WebsiteMetric label="Edit Access" value={workspace.canManage ? "Enabled" : "View only"} description="Owners and admins can add rules." dot={workspace.canManage ? "green" : "gold"} />
      </section>

      <WebsiteSection
        eyebrow="Active Guardrails"
        title="Approved brand rules"
        description="Rules are evaluated in priority order and remain scoped to the active workspace."
      >
        <div className={websiteStyles.cardGrid}>
          {rules.length ? (
            rules.map((rule) => (
              <article key={rule.id} className={websiteStyles.card}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <WebsiteBadge status={rule.category} />
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Priority {rule.priority}
                  </span>
                </div>
                <p className={websiteStyles.cardText}>{rule.rule_text}</p>
              </article>
            ))
          ) : (
            <div className={websiteStyles.empty}>No active brand rules are saved for this workspace.</div>
          )}
        </div>
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Add Rule"
        title="Create another guardrail"
        description="Add rules gradually as the workspace learns what excellent, safe, and on-brand output looks like."
      >
        {workspace.canManage ? (
          <div className={websiteStyles.formFrame}>
            <BrandRuleForm />
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            You can review brand rules, but only account owners and administrators can add them.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
