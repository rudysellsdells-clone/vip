import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrepareZapierActionButton } from "@/components/zapier/PrepareZapierActionButton";
import { ExecuteGmailDraftButton } from "@/components/zapier/ExecuteGmailDraftButton";
import { ExecuteFacebookPostButton } from "@/components/zapier/ExecuteFacebookPostButton";
import { CancelToolRunButton } from "@/components/zapier/CancelToolRunButton";
import { ZapierStatusBadge } from "@/components/zapier/ZapierStatusBadge";
import { buildZapierPreparedAction } from "@/lib/zapier/planner";
import {
  getFacebookPageLockStatus,
  getZapierExecutionDecision,
} from "@/lib/zapier/execution-policy";

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

function getPreparedAction(input: unknown) {
  if (!isRecord(input) || !isRecord(input.preparedAction)) return null;
  return input.preparedAction;
}

function getSourceAsset(input: unknown) {
  if (!isRecord(input) || !isRecord(input.sourceAsset)) return null;
  return input.sourceAsset;
}

function getToolRunInputSummary(input: unknown) {
  const preparedAction = getPreparedAction(input);
  if (!preparedAction) return "Prepared action details unavailable.";

  const app = typeof preparedAction.app === "string" ? preparedAction.app : "Zapier";
  const actionName =
    typeof preparedAction.actionName === "string"
      ? preparedAction.actionName
      : "Prepared Action";

  return `${app}: ${actionName}`;
}

function getNormalizedResult(output: unknown) {
  if (!isRecord(output) || !isRecord(output.normalizedResult)) return null;
  return output.normalizedResult;
}

function getExternalSummary(output: unknown) {
  const normalized = getNormalizedResult(output);
  if (!normalized) return null;

  const summary = typeof normalized.summary === "string" ? normalized.summary : null;
  const externalId = typeof normalized.externalId === "string" ? normalized.externalId : null;
  const externalUrl = typeof normalized.externalUrl === "string" ? normalized.externalUrl : null;

  return { summary, externalId, externalUrl };
}

function canExecuteGmailDraft(action: { action_name: string; status: string }) {
  return (
    action.action_name === "Gmail:draft_v2" &&
    (action.status === "waiting_approval" || action.status === "failed")
  );
}

function canExecuteFacebookPost(
  action: { action_name: string; status: string },
  facebookConfigured: boolean
) {
  return (
    facebookConfigured &&
    action.action_name === "Facebook Pages:page_stream" &&
    (action.status === "waiting_approval" || action.status === "failed")
  );
}

function canCancelAction(status: string) {
  return status === "planned" || status === "waiting_approval" || status === "failed";
}

export default async function ZapierPage() {
  const supabase = await createClient();
  const facebookLock = getFacebookPageLockStatus();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: approvedAssets } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(25);

  const { data: preparedActions } = await supabase
    .from("tool_runs")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "zapier_mcp")
    .order("created_at", { ascending: false })
    .limit(30);

  const completedCount = preparedActions?.filter((action) => action.status === "completed").length ?? 0;
  const failedCount = preparedActions?.filter((action) => action.status === "failed").length ?? 0;
  const waitingCount = preparedActions?.filter((action) => action.status === "waiting_approval").length ?? 0;

  return (
    <main className="mx-auto max-w-6xl space-y-10 p-8">
      <section>
        <p className="text-sm uppercase tracking-wide text-slate-500">Sprint 5.4</p>
        <h1 className="text-3xl font-bold">Execution Results & Audit Trail</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Prepare, execute, verify, and audit every Zapier MCP action from one place.
          Completed actions now show normalized results, external IDs, and source asset context.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Waiting</h2>
          <p className="mt-2 text-3xl font-bold">{waitingCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Completed</h2>
          <p className="mt-2 text-3xl font-bold">{completedCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Failed</h2>
          <p className="mt-2 text-3xl font-bold">{failedCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Facebook Lock</h2>
          <p className="mt-2 text-sm text-slate-600">{facebookLock.message}</p>
        </div>
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
              const decision = getZapierExecutionDecision(`${plan.app}:${plan.action}`);

              return (
                <article key={asset.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {asset.asset_type}
                      </p>
                      <h3 className="mt-1 font-semibold">{asset.title ?? "Untitled asset"}</h3>
                      <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-slate-600">
                        {asset.content.length > 280 ? `${asset.content.slice(0, 280)}...` : asset.content}
                      </p>

                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                        <p className="font-semibold">
                          Planned action: {plan.app} — {plan.actionName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Execution status: {decision.executable ? "Enabled" : "Blocked"}. {decision.reason}
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
              <h3 className="font-semibold">No approved assets ready</h3>
              <p className="mt-2 text-sm text-slate-500">
                Approve campaign assets first, then return here.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Action History</h2>
        <p className="mt-1 text-sm text-slate-500">
          Each action shows its source asset, status, execution result, and external ID when available.
        </p>

        <div className="mt-6 space-y-3">
          {preparedActions?.length ? (
            preparedActions.map((action) => {
              const preparedAction = getPreparedAction(action.input);
              const sourceAsset = getSourceAsset(action.input);
              const decision = getZapierExecutionDecision(action.action_name);
              const externalSummary = getExternalSummary(action.output);

              return (
                <article key={action.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{getToolRunInputSummary(action.input)}</h3>
                        <ZapierStatusBadge status={action.status} />
                      </div>

                      <p className="mt-1 text-sm text-slate-500">{action.action_name}</p>
                      <p className="mt-2 text-sm text-slate-600">{decision.reason}</p>

                      {sourceAsset ? (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                          <p className="font-semibold">Source Asset</p>
                          <p className="mt-1">{String(sourceAsset.title ?? "Untitled asset")}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Type: {String(sourceAsset.assetType ?? "unknown")} · Status at prepare: {String(sourceAsset.status ?? "unknown")}
                          </p>
                        </div>
                      ) : null}

                      {preparedAction ? (
                        <details className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                          <summary className="cursor-pointer font-semibold">Prepared Action JSON</summary>
                          <pre className="mt-3 whitespace-pre-wrap">{JSON.stringify(preparedAction, null, 2)}</pre>
                        </details>
                      ) : null}

                      {action.error ? (
                        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{action.error}</p>
                      ) : null}

                      {externalSummary ? (
                        <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                          <p className="font-semibold">Execution Result</p>
                          {externalSummary.summary ? <p className="mt-1">{externalSummary.summary}</p> : null}
                          {externalSummary.externalId ? <p className="mt-1">External ID: {externalSummary.externalId}</p> : null}
                          {externalSummary.externalUrl ? <p className="mt-1">External URL: {externalSummary.externalUrl}</p> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                      <span className="text-xs text-slate-500">{formatDate(action.created_at)}</span>

                      {canExecuteGmailDraft(action) ? (
                        <ExecuteGmailDraftButton toolRunId={action.id} isRetry={action.status === "failed"} />
                      ) : null}

                      {canExecuteFacebookPost(action, facebookLock.configured) ? (
                        <ExecuteFacebookPostButton
                          toolRunId={action.id}
                          isRetry={action.status === "failed"}
                          pageName={facebookLock.pageName ?? "locked Facebook Page"}
                        />
                      ) : null}

                      {canCancelAction(action.status) ? <CancelToolRunButton toolRunId={action.id} /> : null}
                    </div>
                  </div>
                </article>
              );
            })
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
