import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DigitalCloneProfileForm } from "@/components/clone/DigitalCloneProfileForm";
import { BrandRuleForm } from "@/components/clone/BrandRuleForm";
import { DEFAULT_DIGITAL_CLONE_PROFILE } from "@/lib/clone/defaults";

export default async function BrandVoicePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const workingProfile =
    profile ?? {
      ...DEFAULT_DIGITAL_CLONE_PROFILE,
    };

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Sprint 5.6
        </p>
        <h1 className="text-3xl font-bold">Digital Clone Profile</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Manage the business memory VIP uses to sound like Rudy, sell Rudy&apos;s services, and stay inside the approval guardrails.
        </p>
      </section>

      <DigitalCloneProfileForm profile={workingProfile} />

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Brand Rules</h2>
            <p className="mt-1 text-sm text-slate-500">
              Rules that guide tone, positioning, safety, and business behavior.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {brandRules?.length ? (
            brandRules.map((rule) => (
              <article key={rule.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {rule.category}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">{rule.rule_text}</p>
                  </div>
                  <span className="text-xs text-slate-500">Priority {rule.priority}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
              No brand rules yet. Add a few rules below.
            </div>
          )}
        </div>

        <div className="mt-5">
          <BrandRuleForm />
        </div>
      </section>
    </main>
  );
}
