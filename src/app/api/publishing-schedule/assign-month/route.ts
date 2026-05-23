import { NextResponse } from "next/server";
import {
  buildMonthlyScheduleAssignments,
  normalizeScheduleRequest,
  scheduleMonthLabel,
} from "@/lib/publishing-schedule/scheduler";
import { SCHEDULABLE_ASSET_TYPES } from "@/lib/publishing-schedule/defaults";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export async function POST(request: Request) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { year, month, timezone, overwriteExisting } = normalizeScheduleRequest(body);

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString();
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();

  let query = supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .in("asset_type", SCHEDULABLE_ASSET_TYPES)
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: true });

  if (!overwriteExisting) {
    query = query.or("scheduled_publish_at.is.null,scheduling_status.eq.unscheduled");
  }

  const { data: assetsData, error: assetsError } = await query;

  if (assetsError) {
    return NextResponse.json({ error: assetsError.message }, { status: 400 });
  }

  const assets = (assetsData ?? []) as Array<Record<string, any>>;
  const assignments = buildMonthlyScheduleAssignments({
    assets,
    year,
    month,
    timezone,
  });

  const updatedAssets: Array<Record<string, any>> = [];
  const errors: string[] = [];

  for (const assignment of assignments) {
    const { data, error } = await supabase
      .from("generated_assets")
      .update({
        scheduled_publish_at: assignment.scheduled_publish_at,
        publish_timezone: assignment.publish_timezone,
        scheduling_status: "scheduled",
        scheduling_notes: assignment.scheduling_notes,
      })
      .eq("id", assignment.asset.id)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .select("*")
      .single();

    if (error) {
      errors.push(`${assignment.asset.title ?? assignment.asset.id}: ${error.message}`);
    } else if (data) {
      updatedAssets.push(data);
    }
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "monthly_publish_schedule_assigned",
    title: "Monthly publish schedule assigned",
    description: `${updatedAssets.length} asset(s) scheduled for ${scheduleMonthLabel(year, month)}.`,
    metadata: {
      year,
      month,
      timezone,
      overwriteExisting,
      scheduledCount: updatedAssets.length,
      errorCount: errors.length,
      errors,
      assetIds: updatedAssets.map((asset) => asset.id),
    },
  });

  return NextResponse.json({
    ok: true,
    year,
    month,
    timezone,
    scheduledCount: updatedAssets.length,
    errorCount: errors.length,
    errors,
    assets: updatedAssets,
  });
}
