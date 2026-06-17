import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { getAccountWriteClient, textValue, userCanManageAccount } from "@/lib/accounts/account-utils";

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

    const canArchive = await userCanManageAccount({ supabase, accountId, userId: user.id });

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