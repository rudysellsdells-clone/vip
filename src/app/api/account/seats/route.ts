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

function isOwnerProfile(profile: Record<string, any> | null | undefined, userId: string) {
  const role = String(profile?.account_role ?? "owner");
  const ownerId = String(profile?.account_owner_id ?? userId);
  return role === "owner" && ownerId === userId;
}

async function maybeInviteUser({
  email,
  fullName,
  ownerUserId,
  role,
}: {
  email: string;
  fullName: string;
  ownerUserId: string;
  role: string;
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { invited: false, authUserId: null as string | null };
  }

  try {
    const admin = createAdminClient() as any;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName || email,
        account_owner_id: ownerUserId,
        account_role: role,
      },
    });

    if (error) {
      return { invited: false, authUserId: null as string | null };
    }

    const authUserId = data?.user?.id ?? null;

    if (authUserId) {
      await admin.from("profiles").upsert({
        id: authUserId,
        email,
        full_name: fullName || email,
        timezone: "America/Chicago",
        account_owner_id: ownerUserId,
        account_role: role,
        account_status: "pending",
        updated_at: new Date().toISOString(),
      });
    }

    return { invited: true, authUserId };
  } catch {
    return { invited: false, authUserId: null as string | null };
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!isOwnerProfile(profile, user.id)) {
    return NextResponse.json(
      { error: "Only the owner account can create seats." },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const email = cleanEmail(formData.get("email"));
  const fullName = cleanText(formData.get("full_name"));
  const requestedRole = cleanText(formData.get("role"));
  const role = ALLOWED_ROLES.has(requestedRole) ? requestedRole : "viewer";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  if (email === String(user.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "The owner account is already active. Add a different email address." }, { status: 400 });
  }

  const invite = await maybeInviteUser({
    email,
    fullName,
    ownerUserId: user.id,
    role,
  });

  const { data: seat, error } = await supabase
    .from("account_seats")
    .upsert(
      {
        owner_user_id: user.id,
        invited_by: user.id,
        auth_user_id: invite.authUserId,
        email,
        full_name: fullName || null,
        role,
        status: invite.authUserId ? "pending" : "pending",
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
    metadata: { seatId: seat.id, email, role, inviteAttempted: invite.invited, authUserId: invite.authUserId },
  });

  return NextResponse.json({ ok: true, seat, inviteAttempted: invite.invited, authUserId: invite.authUserId });
}
