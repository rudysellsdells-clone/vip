import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

const ALLOWED_ROLES = new Set(["admin", "editor", "reviewer", "viewer"]);

function cleanEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function maybeInviteUser(email: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(email);
    return !error;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const email = cleanEmail(formData.get("email"));
  const fullName = cleanText(formData.get("full_name"));
  const requestedRole = cleanText(formData.get("role"));
  const role = ALLOWED_ROLES.has(requestedRole) ? requestedRole : "viewer";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const inviteAttempted = await maybeInviteUser(email);

  const { data: seat, error } = await supabase
    .from("account_seats")
    .upsert(
      {
        owner_user_id: user.id,
        invited_by: user.id,
        email,
        full_name: fullName || null,
        role,
        status: "pending",
        invited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_user_id,email" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "account_seat_added",
    title: "Account seat added",
    description: email,
    metadata: { seatId: seat.id, email, role, inviteAttempted },
  });

  return NextResponse.json({ ok: true, seat, inviteAttempted });
}
