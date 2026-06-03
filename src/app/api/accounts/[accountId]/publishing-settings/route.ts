import { NextResponse } from "next/server";
import {
  getAccountWriteClient,
  nullableTextValue,
  userCanManageAccount,
} from "@/lib/accounts/account-utils";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

export async function PUT(
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
        { error: "Only account owners and admins can update publishing settings." },
        { status: 403 },
      );
    }

    const writeSupabase = getAccountWriteClient();

    if (!writeSupabase) {
      return NextResponse.json(
        { error: "Saving account publishing settings requires SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const payload = {
      account_id: accountId,
      linkedin_page_name: nullableTextValue(body.linkedinPageName),
      linkedin_company_id: nullableTextValue(body.linkedinCompanyId),
      facebook_page_name: nullableTextValue(body.facebookPageName),
      facebook_page_id: nullableTextValue(body.facebookPageId),
      primary_booking_url: nullableTextValue(body.primaryBookingUrl),
      galaxyai_style: nullableTextValue(body.galaxyAiStyle),
      default_hashtags: nullableTextValue(body.defaultHashtags),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await writeSupabase
      .from("account_publishing_settings")
      .upsert(payload, { onConflict: "account_id" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error saving publishing settings." },
      { status: 500 },
    );
  }
}
