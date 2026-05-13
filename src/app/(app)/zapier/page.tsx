import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrepareZapierActionButton } from "@/components/zapier/PrepareZapierActionButton";
import { buildZapierPreparedAction } from "@/lib/zapier/planner";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getToolRunInputSummary(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return "Prepared action details unavailable.";
  }

  const value = input as Record<string, unknown>;
  const preparedAction = value.preparedAction;

  if (
    !preparedAction ||
    typeof preparedAction !== "object" ||
    Array.isArray(preparedAction)
  ) {
    return "Prepared action details unavailable.";
  }

  const action = preparedAction as Record<string, unknown>;
  const app = typeof action.app === "string" ? action.app : "Zapier";
  const actionName =
    typeof action.actionName === "string" ? action.actionName : "Prepared Action";

  return `${app}: ${actionName}`;
}

export default async function ZapierPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: approvedAssets, error: approvedAssetsError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(25);

  if (approvedAssetsError) {
    console.error("Failed to load approved assets", approvedAssetsError);
  }

  const { data: preparedActions, error: preparedActionsError } = await supabase
    .from("tool_runs")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "zapier_mcp")
    .order("created_at", { ascending: false })
    .limit(25);

  if (preparedActionsError) {
    console.error("Failed to load prepared Zapier actions", preparedActionsError);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-10 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">
          Sprint 5
        </p>
        <h1 className="text-3xl font-bold">Zapier MCP Preparation</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Prepare approved VIP assets for connected business apps. This page does
          not send, publish, upload, or spend. It creates approval-ready Zapier
          action plans.
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Approved Assets Ready for Zapier</h2>
        <p className="mt-1 text-sm text-slate-500">
          Only approved assets can be prepared for external actions.
        </p>

        <div className="mt-6 space-y-4">
          {approvedAssets?.length ? (
            approvedAssets.map((asset) => {
              const plan = buildZapierPreparedAction({
                id: asset.id,
                campaign_id: asset.campaign_id,
                asset_type: asset.asset_type,
                title: asset.title,
                content: asset.content,
                status: asset.status,
              });

              return (
                <article key={asset.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {asset.asset_type}
                      </p>
                      <h3 className="mt-1 font-semibold">
                        {asset.title ?? "Untitled asset"}
                      </h3>
                      <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-slate-600">
                        {asset.content.length > 280
                          ? `${asset.content.slice(0, 280)}...`
                          : asset.content}
                      </p>

                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                        <p className="font-semibold">
                          Planned action: {plan.app} — {plan.actionName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Risk: {plan.riskLevel}. Approval required before execution.
                        </p>
                      </div>
                    </div>

                    <PrepareZapierActionButton assetId={asset.id} />
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <h3 className="font-semibold">No approved assets yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Approve campaign assets first, then return here to prepare Zapier actions.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Prepared Zapier Actions</h2>
        <p className="mt-1 text-sm text-slate-500">
          These are saved action plans waiting for Rudy approval before execution.
        </p>

        <div className="mt-6 space-y-3">
          {preparedActions?.length ? (
            preparedActions.map((action) => (
              <article key={action.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {getToolRunInputSummary(action.input)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {action.action_name}
                    </p>
                    {action.error ? (
                      <p className="mt-2 text-sm text-red-600">{action.error}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1 text-sm md:items-end">
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                      {action.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(action.created_at)}
                    </span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <h3 className="font-semibold">No prepared actions yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                Prepare an approved asset above to create the first Zapier action plan.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
