import { NextResponse } from "next/server";
import { syncGa4AnalyticsSource } from "@/lib/analytics/ga4-sync";
import {
  AnalyticsHttpError,
  errorMessage,
  errorStatus,
  requireAnalyticsAccountManager,
  textValue,
} from "@/lib/analytics/server";

export const runtime = "nodejs";

function defaultDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export async function POST(request: Request) {
  try {
    const { admin, accountId } = await requireAnalyticsAccountManager();
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const defaults = defaultDateRange();
    const startDate = validDate(textValue(body.startDate, 10)) || defaults.startDate;
    const endDate = validDate(textValue(body.endDate, 10)) || defaults.endDate;
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();

    if (endTime < startTime) {
      throw new AnalyticsHttpError("GA4 sync end date must be on or after the start date.");
    }

    if ((endTime - startTime) / 86_400_000 > 92) {
      throw new AnalyticsHttpError("A manual GA4 sync cannot exceed 93 days.");
    }

    const { data: source, error: sourceError } = await admin
      .from("analytics_data_sources")
      .select("id")
      .eq("account_id", accountId)
      .eq("source_type", "ga4")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sourceError) throw new AnalyticsHttpError(sourceError.message);
    if (!source) {
      throw new AnalyticsHttpError("Connect Google Analytics before synchronizing data.");
    }

    const result = await syncGa4AnalyticsSource({
      sourceId: String(source.id),
      startDate,
      endDate,
    });

    return NextResponse.json({ synced: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "GA4 synchronization failed.") },
      { status: errorStatus(error) },
    );
  }
}
