import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNormalizedResult(output: unknown) {
  if (!isRecord(output) || !isRecord(output.normalizedResult)) return null;
  return output.normalizedResult;
}

function getSourceAsset(input: unknown) {
  if (!isRecord(input) || !isRecord(input.sourceAsset)) return null;
  return input.sourceAsset;
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export default async function ActionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: actions } = await supabase
    .from("tool_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">Audit Trail</p>
        <h1 className="text-3xl font-bold">Action History</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          A clean audit trail of internal, GalaxyAI, Zapier MCP, and manual tool actions.
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {actions?.length ? (
            actions.map((action) => {
              const normalized = getNormalizedResult(action.output);
              const sourceAsset = getSourceAsset(action.input);

              return (
                <article key={action.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="font-semibold">{action.action_name}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Provider: {action.provider} · Status: {action.status}
                      </p>

                      {sourceAsset ? (
                        <p className="mt-2 text-sm text-slate-600">
                          Source: {getString(sourceAsset.title, "Untitled asset")}
                        </p>
                      ) : null}

                      {normalized ? (
                        <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                          <p>{getString(normalized.summary, "Completed")}</p>
                          {getString(normalized.externalId) ? (
                            <p className="mt-1">External ID: {getString(normalized.externalId)}</p>
                          ) : null}
                        </div>
                      ) : null}

                      {action.error ? (
                        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                          {action.error}
                        </p>
                      ) : null}
                    </div>

                    <p className="text-xs text-slate-500">{formatDate(action.created_at)}</p>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <h2 className="font-semibold">No actions yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Tool actions will appear here after VIP prepares or executes work.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
