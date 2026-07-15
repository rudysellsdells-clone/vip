import { NextResponse } from "next/server";
import { syncGa4AnalyticsSource } from "@/lib/analytics/ga4-sync";
import { rollupNativeAnalyticsSource } from "@/lib/analytics/native-rollup";
import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";

export const runtime = "nodejs";
export const maxDuration = 300;

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function scheduledRange(sourceType: "native" | "ga4") {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (sourceType === "ga4" ? 2 : 1));
  return { startDate: dateKey(start), endDate: dateKey(end) };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? "";
  const authorization = request.headers.get("authorization") ?? "";

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = untypedSupabase(createAdminClient());
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("analytics_data_sources")
    .select("id,account_id,source_type,external_property_id,next_sync_at")
    .eq("status", "active")
    .eq("auto_sync_enabled", true)
    .eq("sync_frequency", "daily")
    .order("next_sync_at", { ascending: true, nullsFirst: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sources = ((data ?? []) as Array<{
    id: string;
    account_id: string;
    source_type: "native" | "ga4";
    external_property_id: string | null;
    next_sync_at: string | null;
  }>)
    .filter((source) => !source.next_sync_at || source.next_sync_at <= now)
    .slice(0, 50);
  const results: Array<Record<string, unknown>> = [];

  for (const source of sources) {
    const range = scheduledRange(source.source_type);
    try {
      const result =
        source.source_type === "native"
          ? await rollupNativeAnalyticsSource({
              sourceId: source.id,
              accountId: source.account_id,
              ...range,
              triggerType: "scheduled",
            })
          : await syncGa4AnalyticsSource({
              sourceId: source.id,
              ...range,
              triggerType: "scheduled",
            });

      results.push({
        sourceId: source.id,
        sourceType: source.source_type,
        status: "completed",
        result,
      });
    } catch (syncError) {
      results.push({
        sourceId: source.id,
        sourceType: source.source_type,
        status: "failed",
        error:
          syncError instanceof Error ? syncError.message : "Scheduled sync failed.",
      });
    }
  }

  return NextResponse.json({
    scheduled: true,
    processed: results.length,
    completed: results.filter((item) => item.status === "completed").length,
    failed: results.filter((item) => item.status === "failed").length,
    results,
  });
}
