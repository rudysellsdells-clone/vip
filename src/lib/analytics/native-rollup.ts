import {
  completeAnalyticsSyncRun,
  failAnalyticsSyncRun,
  nextDailySyncAt,
  startAnalyticsSyncRun,
  type AnalyticsSyncTrigger,
} from "@/lib/analytics/sync-runs";
import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";

export async function rollupNativeAnalyticsSource({
  sourceId,
  accountId,
  startDate,
  endDate,
  triggerType,
  createdBy,
}: {
  sourceId: string;
  accountId: string;
  startDate: string;
  endDate: string;
  triggerType: AnalyticsSyncTrigger;
  createdBy?: string | null;
}) {
  const admin = untypedSupabase(createAdminClient());
  const runId = await startAnalyticsSyncRun({
    accountId,
    sourceId,
    sourceType: "native",
    triggerType,
    startDate,
    endDate,
    createdBy,
  });

  try {
    const { data, error } = await admin.rpc("rollup_native_analytics", {
      start_date: startDate,
      end_date: endDate,
      target_account_id: accountId,
    });

    if (error) throw new Error(error.message);

    const result =
      data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const rowsProcessed = Number(
      result.inserted_count ?? result.insertedCount ?? result.rows ?? 0,
    );
    const syncedAt = new Date().toISOString();

    const { error: updateError } = await admin
      .from("analytics_data_sources")
      .update({
        status: "active",
        last_synced_at: syncedAt,
        last_error: null,
        next_sync_at: nextDailySyncAt(),
        updated_at: syncedAt,
      })
      .eq("id", sourceId)
      .eq("account_id", accountId);

    if (updateError) throw new Error(updateError.message);

    await completeAnalyticsSyncRun({
      runId,
      rowsProcessed: Number.isFinite(rowsProcessed) ? rowsProcessed : 0,
      details: { result },
    });

    return {
      runId,
      sourceId,
      accountId,
      startDate,
      endDate,
      rows: Number.isFinite(rowsProcessed) ? rowsProcessed : 0,
      syncedAt,
    };
  } catch (error) {
    await admin
      .from("analytics_data_sources")
      .update({
        status: "error",
        last_error:
          error instanceof Error ? error.message.slice(0, 1000) : "Native rollup failed.",
        next_sync_at: nextDailySyncAt(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId)
      .eq("account_id", accountId);

    await failAnalyticsSyncRun({ runId, error });
    throw error;
  }
}
