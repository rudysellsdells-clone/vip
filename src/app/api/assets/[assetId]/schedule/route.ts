import { NextResponse } from "next/server";
import { DEFAULT_PUBLISH_TIMEZONE } from "@/lib/publishing-schedule/defaults";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const scheduledAt = String(body.scheduled_publish_at || "").trim();
  const timezone = String(body.publish_timezone || DEFAULT_PUBLISH_TIMEZONE).trim() || DEFAULT_PUBLISH_TIMEZONE;
  const notes = String(body.scheduling_notes || "Manually scheduled.").trim();

  if (!scheduledAt) {
    return NextResponse.json(
      { error: "scheduled_publish_at is required." },
      { status: 400 }
    );
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      { error: "scheduled_publish_at must be a valid date/time." },
      { status: 400 }
    );
  }

  const { data: asset, error } = await supabase
    .from("generated_assets")
    .update({
      scheduled_publish_at: date.toISOString(),
      publish_timezone: timezone,
      scheduling_status: "scheduled",
      scheduling_notes: notes,
    })
    .eq("id", assetId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("*")
    .single();

  if (error || !asset) {
    return NextResponse.json(
      { error: error?.message ?? "Asset not found or has been archived." },
      { status: 404 }
    );
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "asset_publish_time_scheduled",
    title: "Asset publish time scheduled",
    description: asset.title ?? assetId,
    metadata: {
      assetId,
      scheduled_publish_at: asset.scheduled_publish_at,
      publish_timezone: asset.publish_timezone,
      scheduling_notes: asset.scheduling_notes,
    },
  });

  return NextResponse.json({
    ok: true,
    asset,
  });
}
