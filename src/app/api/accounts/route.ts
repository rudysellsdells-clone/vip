import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import {
  getAccountWriteClient,
  maybeInviteUserByEmail,
  normalizeEmail,
  slugifyAccountName,
  textValue,
} from "@/lib/accounts/account-utils";
import {
  getUserAccountContext,
  isMasterPlatformRole,
} from "@/lib/accounts/account-context";

function canCreateManagedAccount(profile: { platform_role?: string | null } | null) {
  return isMasterPlatformRole(profile?.platform_role);
}

export async function GET() {
  try {
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountContext = await getUserAccountContext({ supabase, userId: user.id });
    const accountIds = accountContext.accounts.map((account) => account.id);

    if (!accountIds.length) {
      return NextResponse.json({ accounts: [], memberships: [] });
    }

    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("*")
      .in("id", accountIds)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 400 });
    }

    const visibleAccountIds = ((accounts ?? []) as Array<{ id: string }>).map((account) => account.id);

    const { data: memberships, error: membershipsError } = visibleAccountIds.length
      ? await supabase
          .from("account_memberships")
          .select("*")
          .in("account_id", visibleAccountIds)
          .is("removed_at", null)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (membershipsError) {
      return NextResponse.json({ error: membershipsError.message }, { status: 400 });
    }

    return NextResponse.json({ accounts: accounts ?? [], memberships: memberships ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error loading accounts." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = textValue(body.name);
    const ownerEmail = normalizeEmail(body.ownerEmail || user.email);
    const ownerName = textValue(body.ownerName);
    const websiteUrl = textValue(body.websiteUrl);
    const primaryCta = textValue(body.primaryCta);

    if (!name) {
      return NextResponse.json({ error: "Account name is required." }, { status: 400 });
    }

    if (!ownerEmail) {
      return NextResponse.json({ error: "Owner email is required." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,platform_role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    if (!canCreateManagedAccount(profile)) {
      return NextResponse.json(
        { error: "Only the VIP owner or an admin can create separate client accounts." },
        { status: 403 },
      );
    }

    const writeSupabase = getAccountWriteClient();

    if (!writeSupabase) {
      return NextResponse.json(
        {
          error:
            "Account creation requires SUPABASE_SERVICE_ROLE_KEY in Vercel so VIP can create managed accounts safely from the server.",
        },
        { status: 500 },
      );
    }

    const { data: account, error: accountError } = await writeSupabase
      .from("accounts")
      .insert({
        name,
        slug: slugifyAccountName(name),
        website_url: websiteUrl || null,
        primary_cta: primaryCta || null,
        owner_user_id: user.id,
        created_by_user_id: user.id,
        status: "active",
        settings: {
          requested_owner_email: ownerEmail,
          requested_owner_name: ownerName || null,
          created_from: "accounts_page",
        },
      })
      .select("*")
      .single();

    if (accountError) {
      return NextResponse.json({ error: accountError.message }, { status: 400 });
    }

    await Promise.all([
      writeSupabase.from("account_brand_profiles").upsert(
        {
          account_id: account.id,
          company_name: name,
          website_url: websiteUrl || null,
          primary_cta: primaryCta || null,
          tone: "Practical, credible, helpful, and professional.",
          notes: "Created with the account workspace.",
        },
        { onConflict: "account_id" },
      ),
      writeSupabase.from("account_publishing_settings").upsert(
        {
          account_id: account.id,
          primary_booking_url: primaryCta || null,
          galaxyai_style:
            "Polished short-form social video, business-focused, clean motion, no exaggerated claims.",
        },
        { onConflict: "account_id" },
      ),
      writeSupabase
        .from("profiles")
        .update({
          default_account_id: account.id,
          last_active_account_id: account.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id),
    ]);

    const currentUserEmail = normalizeEmail(user.email);

    const { error: ownerMembershipError } = await writeSupabase
      .from("account_memberships")
      .insert({
        account_id: account.id,
        user_id: user.id,
        email: currentUserEmail || ownerEmail,
        full_name: profile.full_name ?? user.email ?? "VIP Owner",
        role: "owner",
        status: "active",
        invited_by_user_id: user.id,
        accepted_at: new Date().toISOString(),
      });

    if (ownerMembershipError) {
      return NextResponse.json({ error: ownerMembershipError.message }, { status: 400 });
    }

    let inviteResult: Awaited<ReturnType<typeof maybeInviteUserByEmail>> | null = null;

    if (ownerEmail && ownerEmail !== currentUserEmail) {
      const { error: invitedOwnerError } = await writeSupabase
        .from("account_memberships")
        .insert({
          account_id: account.id,
          user_id: null,
          email: ownerEmail,
          full_name: ownerName || null,
          role: "owner",
          status: "pending",
          invited_by_user_id: user.id,
        });

      if (invitedOwnerError) {
        return NextResponse.json({ error: invitedOwnerError.message }, { status: 400 });
      }

      inviteResult = await maybeInviteUserByEmail({
        email: ownerEmail,
        fullName: ownerName || null,
        accountId: account.id,
        role: "owner",
      });
    }

    return NextResponse.json({ account, invite: inviteResult }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error creating account." },
      { status: 500 },
    );
  }
}
