import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = { params: Promise<{ seatId: string }> };

function isOwnerProfile(profile: Record<string, any> | null | undefined, userId: string) {
  const role = String(profile?.account_role ?? "owner");
  const ownerId = String(profile?.account_owner_id ?? userId);
  return role === "owner" && ownerId === userId;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { seatId } = await context.params;
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!isOwnerProfile(profile, user.id)) {
    return NextResponse.json(
      { error: "Only the owner account can remove seats." },
      { status: 403 }
    );
  }

  const { data: seat, error } = await supabase
    .from("account_seats")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", seatId)
    .eq("owner_user_id", user.id)
    .select("*")
    .single();

  if (error || !seat) {
    return NextResponse.json({ error: error?.message ?? "Seat not found." }, { status: 404 });
  }

  if (seat.auth_user_id) {
    await supabase
      .from("profiles")
      .update({
        account_status: "removed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", seat.auth_user_id)
      .eq("account_owner_id", user.id);
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "account_seat_removed",
    title: "Account seat removed",
    description: seat.email,
    metadata: { seatId, email: seat.email, authUserId: seat.auth_user_id ?? null },
  });

  return NextResponse.json({ ok: true, seat });
}
