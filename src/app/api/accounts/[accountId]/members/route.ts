import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import {
  isAccountRole,
  maybeInviteUserByEmail,
  normalizeEmail,
  textValue,
} from "@/lib/accounts/account-utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const { accountId } = await params;
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const email = normalizeEmail(body.email);
    const fullName = textValue(body.fullName);
    const requestedRole = textValue(body.role) || "viewer";
    const role = isAccountRole(requestedRole) ? requestedRole : "viewer";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id,email,full_name")
      .ilike("email", email)
      .maybeSingle();

    const status = existingProfile?.id ? "active" : "pending";
    const acceptedAt = existingProfile?.id ? new Date().toISOString() : null;

    const { data: membership, error: membershipError } = await supabase
      .from("account_memberships")
      .insert({
        account_id: accountId,
        user_id: existingProfile?.id ?? null,
        email,
        full_name: fullName || existingProfile?.full_name || null,
        role,
        status,
        invited_by_user_id: user.id,
        accepted_at: acceptedAt,
      })
      .select("*")
      .single();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 400 });
    }

    const invite = existingProfile?.id
      ? {
          attempted: false,
          sent: false,
          message: "User already has a VIP profile, so they were added directly.",
        }
      : await maybeInviteUserByEmail({
          email,
          fullName: fullName || null,
          accountId,
          role,
        });

    return NextResponse.json({ membership, invite }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error inviting account member." },
      { status: 500 },
    );
  }
}
