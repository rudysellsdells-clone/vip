import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { textValue } from "@/lib/accounts/account-utils";

function getAccountWriteClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return untypedSupabase(createAdminClient());
}

async function userCanArchiveAccount({
  supabase,
  accountId,
  userId,
}: {
  supabase: any;
  accountId: string;
  userId: string;
}) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,platform_role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.platform_role === "owner" || profile?.platform_role === "admin") {
    return true;
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id,owner_user_id,status")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError || !account || account.status === "archived") {
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

    const canArchive = await userCanArchiveAccount({ supabase, accountId, userId: user.id });

    if (!canArchive) {
      return NextResponse.json(
        { error: "Only VIP owners, platform admins, account owners, or account admins can remove accounts." },
        { status: 403 },
      );
    }

    const writeSupabase = getAccountWriteClient();

    if (!writeSupabase) {
      return NextResponse.json(
        {
          error:
            "Removing accounts requires SUPABASE_SERVICE_ROLE_KEY in Vercel so VIP can archive accounts safely from the server.",
        },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = textValue(body.reason) || "Removed from VIP accounts page.";
    const archivedAt = new Date().toISOString();

    const { data: account, error: accountError } = await writeSupabase
      .from("accounts")
      .update({
        status: "archived",
        settings: {
          archived_at: archivedAt,
          archived_by_user_id: user.id,
          archive_reason: reason,
          removed_from: "accounts_page",
        },
      })
      .eq("id", accountId)
      .select("id,name,status")
      .single();

    if (accountError) {
      return NextResponse.json({ error: accountError.message }, { status: 400 });
    }

    return NextResponse.json({ account, archivedAt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error removing account." },
      { status: 500 },
    );
  }
}
