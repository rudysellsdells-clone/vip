import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

const VALID_STATUSES = new Set([
  "planned",
  "generated",
  "needs_review",
  "approved",
  "scheduled",
  "published",
  "skipped",
]);

export async function POST(request: Request, context: RouteContext) {
  const { itemId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const status = String(formData.get("status") || "").trim();

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid calendar item status." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_calendar_items")
    .update({ status })
    .eq("id", itemId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "content_calendar_item_status_updated",
    title: "Content calendar item updated",
    description: `${data.title} marked ${status}`,
    metadata: {
      itemId,
      planId: data.plan_id,
      status,
      itemType: data.item_type,
      scheduledDate: data.scheduled_date,
    },
  });

  return NextResponse.json({ item: data });
}
