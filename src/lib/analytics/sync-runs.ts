import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";

export type AnalyticsSyncTrigger = "initial" | "manual" | "scheduled" | "retry";
export type AnalyticsSyncSourceType = "native" | "ga4";

type StartSyncRunInput = {
  accountId: string;
  sourceId: string;
  sourceType: AnalyticsSyncSourceType;
  triggerType: AnalyticsSyncTrigger;
  startDate: string;
  endDate: string;
  createdBy?: string | null;
  details?: Record<string, unknown>;
};

export async function startAnalyticsSyncRun(input: StartSyncRunInput) {
  const admin = untypedSupabase(createAdminClient());
  const { data, error } = await admin
    .from("analytics_sync_runs")
    .insert({
      account_id: input.accountId,
      source_id: input.sourceId,
      source_type: input.sourceType,
      trigger_type: input.triggerType,
      status: "running",
      start_date: input.startDate,
      end_date: input.endDate,
      created_by: input.createdBy ?? null,
      details: input.details ?? {},
    })
    .select("id")
    .single();

  if (error) {
    if (
      error.code === "23505" &&
      (error.message.includes("analytics_sync_runs_one_running_per_source_idx") ||
        error.message.includes("duplicate key value"))
    ) {
      throw new Error(
        "A synchronization is already running for this analytics connection. Wait for it to finish, then try again.",
      );
    }

    throw new Error(error.message);
  }

  return String(data.id);
}

export async function completeAnalyticsSyncRun({
  runId,
  rowsProcessed,
  details,
}: {
  runId: string;
  rowsProcessed: number;
  details?: Record<string, unknown>;
}) {
  const admin = untypedSupabase(createAdminClient());
  const { error } = await admin
    .from("analytics_sync_runs")
    .update({
      status: "completed",
      rows_processed: Math.max(0, Math.round(rowsProcessed)),
      error_message: null,
      details: details ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw new Error(error.message);
}

export async function failAnalyticsSyncRun({
  runId,
  error,
  details,
}: {
  runId: string;
  error: unknown;
  details?: Record<string, unknown>;
}) {
  const admin = untypedSupabase(createAdminClient());
  const message =
    error instanceof Error ? error.message.slice(0, 2000) : "Analytics sync failed.";

  const { error: updateError } = await admin
    .from("analytics_sync_runs")
    .update({
      status: "failed",
      error_message: message,
      details: details ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (updateError) throw new Error(updateError.message);
}

export function nextDailySyncAt() {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(11, 15, 0, 0);
  return next.toISOString();
}
