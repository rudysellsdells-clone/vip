import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrepareZapierActionButton } from "@/components/zapier/PrepareZapierActionButton";
import { ExecuteGmailDraftButton } from "@/components/zapier/ExecuteGmailDraftButton";
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
  }).format(new Date(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getToolRunInputSummary(input: unknown) {
  if (!isRecord(input)) {
    return "Prepared action details unavailable.";
  }

  const preparedAction = input.preparedAction;

  if (!isRecord(preparedAction)) {
    return "Prepared action details unavailable.";
  }

  const app = typeof preparedAction.app === "string" ? preparedAction.app : "Zapier";
  const actionName =
    typeof preparedAction.actionName === "string"
      ? preparedAction.actionName
      : "Prepared Action";

  return `${app}: ${actionName}`;
}

function getPreparedActionDetails(input: unknown) {
  if (!isRecord(input)) {
    return null;
  }

  const preparedAction = input.preparedAction;

  if (!isRecord(preparedAction)) {
    return null;
  }

  return preparedAction;
}

function getToolRunOutputSummary(output: unknown) {
  if (!isRecord(output)) {
    return null;
  }

  const content = output.content;

  if (Array.isArray(content)) {
    const textParts = content
      .map((item) => {
        if (!isRecord(item)) return null;
        return typeof item.text === "string" ? item.text : null;
      })
      .filter(Boolean);

    return textParts.length ? textParts.join("\n") : null;
  }

  return Object.keys(output).length ? JSON.stringify(output, null, 2) : null;
}

function canExecuteGmailDraft(action: {
  action_name: string;
  status: string;
}) {
  return (
    action.action_name === "Gmail:draft_v2" &&
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
          Sprint 5.2
        </p>
        <h1 className="text-3xl font-bold">Zapier Execution Controls</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Manage approved VIP assets, prepared Zapier actions, execution status,
          retries, cancellations, and publishing guardrails.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Gmail Drafts</h2>
          <p className="mt-2 text-sm text-slate-600">
            Enabled. Creates drafts only. Does not send emails.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Facebook Page Lock</h2>
          <p className="mt-2 text-sm text-slate-600">{facebookLock.message}</p>
          {facebookLock.configured ? (
            <p className="mt-2 text-xs text-emerald-700">
              Locked to {facebookLock.pageName}.
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-700">
              Facebook publishing remains disabled.
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">External Publishing</h2>
          <p className="mt-2 text-sm text-slate-600">
            LinkedIn, Facebook, YouTube, and Synthesia execution remain blocked
            until their channel-specific safety rules are complete.
          </p>
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
                          Execution status: {decision.executable ? "Enabled" : "Blocked"}.
                          {" "}
                          {decision.reason}
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
          Review status, retry safe Gmail drafts, cancel stale actions, and inspect results.
        </p>

        <div className="mt-6 space-y-3">
          {preparedActions?.length ? (
            preparedActions.map((action) => {
              const outputSummary = getToolRunOutputSummary(action.output);
              const preparedAction = getPreparedActionDetails(action.input);
              const decision = getZapierExecutionDecision(action.action_name);

              return (
                <article key={action.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {getToolRunInputSummary(action.input)}
                        </h3>
                        <ZapierStatusBadge status={action.status} />
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {action.action_name}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {decision.reason}
                      </p>

                      {preparedAction ? (
                        <pre className="mt-3 max-w-3xl whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                          {JSON.stringify(preparedAction, null, 2)}
                        </pre>
                      ) : null}

                      {action.error ? (
                        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                          {action.error}
                        </p>
                      ) : null}

                      {outputSummary ? (
                        <pre className="mt-3 max-w-3xl whitespace-pre-wrap rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                          {outputSummary}
                        </pre>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                      <span className="text-xs text-slate-500">
                        {formatDate(action.created_at)}
                      </span>

                      {canExecuteGmailDraft(action) ? (
                        <ExecuteGmailDraftButton
                          toolRunId={action.id}
                          isRetry={action.status === "failed"}
                        />
                      ) : null}

                      {canCancelAction(action.status) ? (
                        <CancelToolRunButton toolRunId={action.id} />
                      ) : null}
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
