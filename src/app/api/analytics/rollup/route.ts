import { NextResponse } from "next/server";
import { rollupNativeAnalyticsSource } from "@/lib/analytics/native-rollup";
import {
  AnalyticsHttpError,
  errorMessage,
  errorStatus,
  requireAnalyticsAccountManager,
  textValue,
} from "@/lib/analytics/server";

export const runtime = "nodejs";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);
  return { startDate: dateKey(start), endDate: dateKey(end) };
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export async function POST(request: Request) {
  try {
    const { admin, accountId, user } = await requireAnalyticsAccountManager();
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const defaults = defaultRange();
    const startDate = validDate(textValue(body.startDate, 10)) || defaults.startDate;
    const endDate = validDate(textValue(body.endDate, 10)) || defaults.endDate;

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      throw new AnalyticsHttpError(
        "Analytics rollup end date must be on or after the start date.",
      );
    }

    const { data: source, error: sourceError } = await admin
      .from("analytics_data_sources")
      .select("id")
      .eq("account_id", accountId)
      .eq("source_type", "native")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sourceError) throw new AnalyticsHttpError(sourceError.message);
    if (!source) {
      throw new AnalyticsHttpError("Enable Marketing VIP Native before refreshing metrics.");
    }

    const result = await rollupNativeAnalyticsSource({
      sourceId: String(source.id),
      accountId,
      startDate,
      endDate,
      triggerType: "manual",
      createdBy: user.id,
    });

    return NextResponse.json({ rolledUp: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Native analytics rollup failed.") },
      { status: errorStatus(error) },
    );
  }
}
