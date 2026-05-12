import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignForm } from "@/components/campaigns/CampaignForm";

export default async function CampaignsPage() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Sprint 1</p>
        <h1 className="mt-2 text-3xl font-bold">Create Campaign</h1>
        <p className="mt-2 text-slate-600">
          Save the first revenue-focused campaign record for Rudy’s Marketing Twin.
        </p>
      </section>

      <CampaignForm />
    </main>
  );
}
