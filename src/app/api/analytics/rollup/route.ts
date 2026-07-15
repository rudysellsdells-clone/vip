import { NextResponse } from "next/server";
import {
  AnalyticsHttpError,
  errorMessage,
  errorStatus,
  requireAnalyticsAccountManager,
  textValue,
} from "@/lib/analytics/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";

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

async function handle(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET?.trim() ?? "";
    const authorization = request.headers.get("authorization") ?? "";
    const isCron = Boolean(
      cronSecret && authorization === `Bearer ${cronSecret}`,
    );
    let targetAccountId: string | null = null;

    if (!isCron) {
      const manager = await requireAnalyticsAccountManager();
      targetAccountId = manager.accountId;
    }

    const defaults = defaultRange();
    const requestUrl = new URL(request.url);
    let body: Record<string, unknown> = {};

    if (request.method === "POST") {
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }

    const startDate =
      validDate(
        textValue(body.startDate, 10) ||
          textValue(requestUrl.searchParams.get("startDate"), 10),
      ) || defaults.startDate;
    const endDate =
      validDate(
        textValue(body.endDate, 10) ||
          textValue(requestUrl.searchParams.get("endDate"), 10),
      ) || defaults.endDate;

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      throw new AnalyticsHttpError(
        "Analytics rollup end date must be on or after the start date.",
      );
    }

    const admin = untypedSupabase(createAdminClient());
    const { data, error } = await admin.rpc("rollup_native_analytics", {
      start_date: startDate,
      end_date: endDate,
      target_account_id: targetAccountId,
    });

    if (error) throw new AnalyticsHttpError(error.message);

    return NextResponse.json({ rolledUp: true, result: data });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Native analytics rollup failed.") },
      { status: errorStatus(error) },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
