import { NextResponse } from "next/server";
import { getUserAccountContext, setActiveAccountForUser } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

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
    const accountId = String(body.accountId ?? "").trim();

    if (!accountId) {
      return NextResponse.json({ error: "Account id is required." }, { status: 400 });
    }

    const context = await getUserAccountContext({ supabase, userId: user.id });
    const account = context.accounts.find((item) => item.id === accountId);

    if (!account) {
      return NextResponse.json(
        { error: "You do not have access to that account." },
        { status: 403 },
      );
    }

    await setActiveAccountForUser({ accountId, userId: user.id });

    return NextResponse.json({ accountId, accountName: account.name });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error switching account." },
      { status: 500 },
    );
  }
}
