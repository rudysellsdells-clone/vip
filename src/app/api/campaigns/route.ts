import { NextResponse } from "next/server";
import { getUserAccountContext } from "@/lib/accounts/account-context";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { createCampaignSchema } from "@/lib/validation/campaignSchemas";
import { logActivity } from "@/lib/security/auditLog";

async function accountRecordExists({
  supabase,
  table,
  id,
  accountId,
}: {
  supabase: any;
  table: "service_lines" | "offers";
  id: string | null | undefined;
  accountId: string;
}) {
  if (!id) return true;

  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("account_id", accountId)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function POST(request: Request) {
  try {
    const supabase = untypedSupabase(await createClient());
    const rawBody = await request.json();
    const requestedServiceLineId = rawBody.serviceLineId ?? rawBody.service_line_id;
    const requestedOfferId = rawBody.offerId ?? rawBody.offer_id;
    const body = {
      ...rawBody,
      serviceLineId: requestedServiceLineId || undefined,
      offerId: requestedOfferId || undefined,
      buyerSegment: rawBody.buyerSegment ?? rawBody.buyer_segment,
    };
    const input = createCampaignSchema.parse(body);

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountContext = await getUserAccountContext({ supabase, userId: user.id });
    const activeAccountId = accountContext.activeAccountId;

    if (!activeAccountId) {
      return NextResponse.json(
        { error: "Select or create an account workspace before creating campaigns." },
        { status: 403 },
      );
    }

    if (!(await accountRecordExists({ supabase, table: "service_lines", id: input.serviceLineId, accountId: activeAccountId }))) {
      return NextResponse.json(
        { error: "Selected service line does not belong to the active account." },
        { status: 400 },
      );
    }

    if (!(await accountRecordExists({ supabase, table: "offers", id: input.offerId, accountId: activeAccountId }))) {
      return NextResponse.json(
        { error: "Selected offer does not belong to the active account." },
        { status: 400 },
      );
    }

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: "Rudy McCormick",
      timezone: "America/Chicago"
    });

    const notesWithServiceLine = [
      input.serviceLine ? `Service line: ${input.serviceLine}` : null,
      input.notes || null
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        account_id: activeAccountId,
        user_id: user.id,
        service_line_id: input.serviceLineId ?? null,
        offer_id: input.offerId ?? null,
        name: input.name,
        idea: input.idea,
        buyer_segment: input.buyerSegment,
        audience: input.audience ?? input.buyerSegment,
        goal: input.goal,
        platforms: input.platforms,
        tone: input.tone ?? "Clear, practical, confident",
        cta: input.cta,
        notes: notesWithServiceLine || null,
        status: "draft"
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "campaign_created",
      title: "Campaign created",
      description: `Created campaign: ${campaign.name}`,
      metadata: { campaignId: campaign.id, accountId: activeAccountId }
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error creating campaign." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountContext = await getUserAccountContext({ supabase, userId: user.id });
    const activeAccountId = accountContext.activeAccountId;

    if (!activeAccountId) {
      return NextResponse.json({ campaigns: [] });
    }

    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("account_id", activeAccountId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error loading campaigns." },
      { status: 500 }
    );
  }
}
