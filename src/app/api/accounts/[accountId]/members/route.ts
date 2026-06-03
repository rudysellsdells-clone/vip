import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import {
  isAccountRole,
  maybeInviteUserByEmail,
  normalizeEmail,
  textValue,
} from "@/lib/accounts/account-utils";

function getAccountWriteClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return untypedSupabase(createAdminClient());
}

async function userCanManageAccount({
  supabase,
  accountId,
  userId,
}: {
  supabase: any;
  accountId: string;
  userId: string;
}) {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id,owner_user_id")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError || !account) {
    return false;
  }

  if (account.owner_user_id === userId) {
    return true;
  }

  const { data: membership } = await supabase
    .from("account_memberships")
    .select("id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .eq("status", "active")
    .is("removed_at", null)
    .limit(1)
    .maybeSingle();

  return Boolean(membership?.id);
}

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

    const canManage = await userCanManageAccount({ supabase, accountId, userId: user.id });

    if (!canManage) {
      return NextResponse.json(
        { error: "Only account owners and admins can add account members." },
        { status: 403 },
      );
    }

    const writeSupabase = getAccountWriteClient();

    if (!writeSupabase) {
      return NextResponse.json(
        {
          error:
            "Adding account members requires SUPABASE_SERVICE_ROLE_KEY in Vercel so VIP can create memberships safely from the server.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const email = normalizeEmail(body.email);
    const fullName = textValue(body.fullName);
    const requestedRole = textValue(body.role) || "viewer";
    const role = isAccountRole(requestedRole) ? requestedRole : "viewer";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const { data: existingProfile } = await writeSupabase
      .from("profiles")
      .select("id,email,full_name")
      .ilike("email", email)
      .maybeSingle();

    const status = existingProfile?.id ? "active" : "pending";
    const acceptedAt = existingProfile?.id ? new Date().toISOString() : null;

    const { data: membership, error: membershipError } = await writeSupabase
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
