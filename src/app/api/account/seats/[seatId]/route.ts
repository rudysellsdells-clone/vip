import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = { params: Promise<{ seatId: string }> };

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

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "account_seat_removed",
    title: "Account seat removed",
    description: seat.email,
    metadata: { seatId, email: seat.email },
  });

  return NextResponse.json({ ok: true, seat });
}
