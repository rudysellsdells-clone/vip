import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DigitalCloneProfileForm } from "@/components/clone/DigitalCloneProfileForm";
import { BrandRuleForm } from "@/components/clone/BrandRuleForm";
import { DEFAULT_DIGITAL_CLONE_PROFILE } from "@/lib/clone/defaults";
import { VipEmptyState, VipMetricCard, VipSection } from "@/components/vip-ui/VipCards";
import { VipHero, VipPageShell } from "@/components/vip-ui/VipPageShell";

export default async function BrandVoicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("digital_clone_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: brandRules } = await supabase
    .from("brand_rules")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  const workingProfile = profile ?? { ...DEFAULT_DIGITAL_CLONE_PROFILE };
  const rules = (brandRules ?? []) as any[];

  return (
    <VipPageShell>
      <VipHero
        eyebrow="Business Memory"
        title="Brand voice and clone profile"
        description="Control how VIP thinks, writes, positions Rudy's services, and respects approval guardrails."
        primaryAction={{ label: "Knowledge Library", href: "/knowledge" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <VipMetricCard label="Clone Profile" value={profile ? "Active" : "Default"} description="The core memory layer." tone={profile ? "success" : "warning"} />
        <VipMetricCard label="Brand Rules" value={rules.length} description="Voice and behavior guardrails." tone="info" />
        <VipMetricCard label="Safety Mode" value="On" description="External actions require approval." tone="success" />
      </section>

      <div className="vip-card rounded-[1.75rem] p-1">
        <DigitalCloneProfileForm profile={workingProfile} />
      </div>

      <VipSection title="Brand rules" description="Rules that guide tone, positioning, safety, and business behavior.">
        <div className="space-y-3">
          {rules.length ? (
            rules.map((rule) => (
              <article key={rule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">{rule.category}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{rule.rule_text}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    Priority {rule.priority}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <VipEmptyState
              title="No custom rules yet"
              description="Add rules that describe how VIP should sound, sell, and behave."
            />
          )}
        </div>

        <div className="mt-5">
          <BrandRuleForm />
        </div>
      </VipSection>
    </VipPageShell>
  );
}
