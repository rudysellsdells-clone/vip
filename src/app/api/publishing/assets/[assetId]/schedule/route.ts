import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

function validDate(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text) return null;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

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
  const scheduledAt = validDate(body.scheduledPublishAt ?? body.scheduled_publish_at);

  if (!scheduledAt) {
    return NextResponse.json({ error: "A valid scheduled publish date/time is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("generated_assets")
    .update({
      scheduled_publish_at: scheduledAt,
      planned_publish_date: scheduledAt.slice(0, 10),
      publish_timezone: body.publishTimezone ?? "America/Chicago",
      scheduling_status: "scheduled",
    })
    .eq("id", assetId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Unable to schedule asset." }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "asset_scheduled",
    title: "Asset scheduled",
    description: data.title,
    metadata: {
      assetId,
      scheduledPublishAt: scheduledAt,
    },
  });

  return NextResponse.json({ ok: true, asset: data });
}
