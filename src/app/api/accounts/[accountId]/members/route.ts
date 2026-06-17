import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import {
  getAccountWriteClient,
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

    const accountAccess = await getAccountAccessForUser({ supabase, accountId, userId: user.id });

    if (!accountAccess.canManage) {
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

export async function DELETE(
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

    const accountAccess = await getAccountAccessForUser({ supabase, accountId, userId: user.id });

    if (!accountAccess.canManage) {
      return NextResponse.json(
        { error: "Only account owners and admins can remove account members." },
        { status: 403 },
      );
    }

    const writeSupabase = getAccountWriteClient();

    if (!writeSupabase) {
      return NextResponse.json(
        {
          error:
            "Removing account members requires SUPABASE_SERVICE_ROLE_KEY in Vercel so VIP can update memberships safely from the server.",
        },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const membershipId = textValue(body.membershipId);

    if (!membershipId) {
      return NextResponse.json({ error: "Membership id is required." }, { status: 400 });
    }

    const { data: account, error: accountError } = await writeSupabase
      .from("accounts")
      .select("id,owner_user_id")
      .eq("id", accountId)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        { error: accountError?.message ?? "Account not found." },
        { status: 404 },
      );
    }

    const isPlatformManager = accountAccess.isMaster;

    const { data: membership, error: membershipError } = await writeSupabase
      .from("account_memberships")
      .select("id,account_id,user_id,email,role,status,removed_at")
      .eq("id", membershipId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: membershipError?.message ?? "Member was not found on this account." },
        { status: 404 },
      );
    }

    if (membership.removed_at || membership.status === "removed") {
      return NextResponse.json({ membership, message: "Member is already removed." });
    }

    if (membership.user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot remove your own access from this account." },
        { status: 400 },
      );
    }

    if (membership.user_id && membership.user_id === account.owner_user_id) {
      return NextResponse.json(
        { error: "The primary account owner cannot be removed from this screen." },
        { status: 400 },
      );
    }

    if (membership.role === "owner" && !isPlatformManager) {
      return NextResponse.json(
        { error: "Only a VIP platform owner or admin can remove another owner-level membership." },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();

    const { data: removedMembership, error: updateError } = await writeSupabase
      .from("account_memberships")
      .update({
        status: "removed",
        removed_at: now,
        updated_at: now,
      })
      .eq("id", membershipId)
      .eq("account_id", accountId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      membership: removedMembership,
      message: "Member removed from this account.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error removing account member." },
      { status: 500 },
    );
  }
}