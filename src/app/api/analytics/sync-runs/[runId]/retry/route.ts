import { NextResponse } from "next/server";
import { syncGa4AnalyticsSource } from "@/lib/analytics/ga4-sync";
import { rollupNativeAnalyticsSource } from "@/lib/analytics/native-rollup";
import {
  AnalyticsHttpError,
  errorMessage,
  errorStatus,
  optionalUuid,
  requireAnalyticsAccountManager,
} from "@/lib/analytics/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { admin, accountId, user } = await requireAnalyticsAccountManager();
    const { runId: rawRunId } = await context.params;
    const runId = optionalUuid(rawRunId);

    if (!runId) throw new AnalyticsHttpError("A valid sync run ID is required.");

    const { data: run, error } = await admin
      .from("analytics_sync_runs")
      .select("id,source_id,source_type,start_date,end_date,status")
      .eq("id", runId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) throw new AnalyticsHttpError(error.message);
    if (!run) throw new AnalyticsHttpError("Analytics sync run was not found.", 404);
    if (!run.source_id) throw new AnalyticsHttpError("The original data source no longer exists.");

    const result =
      run.source_type === "native"
        ? await rollupNativeAnalyticsSource({
            sourceId: String(run.source_id),
            accountId,
            startDate: String(run.start_date),
            endDate: String(run.end_date),
            triggerType: "retry",
            createdBy: user.id,
          })
        : await syncGa4AnalyticsSource({
            sourceId: String(run.source_id),
            startDate: String(run.start_date),
            endDate: String(run.end_date),
            triggerType: "retry",
            createdBy: user.id,
          });

    return NextResponse.json({ retried: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Analytics sync retry failed.") },
      { status: errorStatus(error) },
    );
  }
}
