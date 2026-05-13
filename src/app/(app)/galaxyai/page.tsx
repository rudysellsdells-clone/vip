import { redirect } from "next/navigation";
import { SyncGalaxyAiWorkflowsButton } from "@/components/galaxyai/SyncGalaxyAiWorkflowsButton";
import { RefreshGalaxyAiRunButton } from "@/components/galaxyai/RefreshGalaxyAiRunButton";
import { createClient } from "@/lib/supabase/server";

export default async function GalaxyAiPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: workflows } = await supabase
    .from("galaxyai_workflows")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const { data: runs } = await supabase
    .from("galaxyai_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <section className="flex flex-col gap-4 rounded-2xl border p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Sprint 4</p>
          <h1 className="text-3xl font-bold">GalaxyAI Workflows</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Sync GalaxyAI workflows, then run approved GalaxyAI prompt assets from campaign pages.
          </p>
        </div>
        <SyncGalaxyAiWorkflowsButton />
      </section>

      <section className="rounded-2xl border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Synced Workflows</h2>
        <div className="mt-4 space-y-3">
          {workflows?.length ? (
            workflows.map((workflow) => (
              <article key={workflow.id} className="rounded-xl border p-4">
                <p className="font-semibold">{workflow.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {workflow.description || "No description available."}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Workflow ID: {workflow.galaxy_workflow_id}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No workflows synced yet. Click Sync GalaxyAI Workflows.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Recent Runs</h2>
        <div className="mt-4 space-y-3">
          {runs?.length ? (
            runs.map((run) => (
              <article key={run.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold">Run {run.galaxy_run_id}</p>
                    <p className="mt-1 text-sm text-slate-500">Status: {run.status}</p>
                    {run.error && <p className="mt-1 text-sm text-red-600">{run.error}</p>}
                  </div>
                  <RefreshGalaxyAiRunButton runId={run.id} />
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">No GalaxyAI runs yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
