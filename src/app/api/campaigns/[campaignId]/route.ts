import { NextResponse } from "next/server";
import { getAccountAccessForUser } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*, generated_assets(*)")
      .eq("id", campaignId)
      .maybeSingle();

    if (error || !campaign) {
      return NextResponse.json({ error: error?.message ?? "Campaign not found." }, { status: 404 });
    }

    const accountId = campaign.account_id ? String(campaign.account_id) : null;

    if (accountId) {
      const accountAccess = await getAccountAccessForUser({ supabase, accountId, userId: user.id });

      if (!accountAccess.canView) {
        return NextResponse.json({ error: "You do not have access to this campaign." }, { status: 403 });
      }
    } else if (campaign.user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this campaign." }, { status: 403 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error loading campaign." },
      { status: 500 }
    );
  }
}
