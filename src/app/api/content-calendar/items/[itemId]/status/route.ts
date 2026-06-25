import { NextResponse } from "next/server";
import { getUserAccountContext } from "@/lib/accounts/account-context";
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

  const accountContext = await getUserAccountContext({ supabase, userId: user.id });
  const activeAccountId = accountContext.activeAccountId;

  if (!activeAccountId) {
    return NextResponse.json({ error: "No active workspace selected." }, { status: 400 });
  }

  if (!accountContext.canManageActiveAccount) {
    return NextResponse.json({ error: "You do not have permission to update this workspace calendar." }, { status: 403 });
  }

  const formData = await request.formData();
  const status = String(formData.get("status") || "").trim();

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid calendar item status." }, { status: 400 });
  }

  const { data: existingItem, error: loadError } = await supabase
    .from("content_calendar_items")
    .select("id,user_id,account_id")
    .eq("id", itemId)
    .maybeSingle();

  if (loadError || !existingItem) {
    return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
  }

  const itemAccountId = existingItem.account_id ? String(existingItem.account_id) : null;

  if (itemAccountId && itemAccountId !== activeAccountId) {
    return NextResponse.json({ error: "Calendar item belongs to another workspace." }, { status: 403 });
  }

  if (!itemAccountId && (!accountContext.isMaster || String(existingItem.user_id ?? "") !== user.id)) {
    return NextResponse.json({ error: "Legacy unassigned calendar item cannot be updated by this user." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("content_calendar_items")
    .update({ status, account_id: activeAccountId })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: activeAccountId,
    activity_type: "content_calendar_item_status_updated",
    title: "Content calendar item updated",
    description: `${data.title} marked ${status}`,
    metadata: {
      itemId,
      accountId: activeAccountId,
      planId: data.plan_id,
      status,
      itemType: data.item_type,
      scheduledDate: data.scheduled_date,
    },
  });

  return NextResponse.json({ item: data });
}