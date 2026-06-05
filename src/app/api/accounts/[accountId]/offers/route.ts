import { NextResponse } from "next/server";
import {
  getAccountWriteClient,
  nullableTextValue,
  textValue,
  userCanManageAccount,
} from "@/lib/accounts/account-utils";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function lines(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function requireManager(accountId: string) {
  const supabase = untypedSupabase(await createClient());
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const canManage = await userCanManageAccount({ supabase, accountId, userId: user.id });

  if (!canManage) {
    return {
      error: NextResponse.json(
        { error: "Only account owners and admins can manage this account strategy." },
        { status: 403 },
      ),
    };
  }

  const writeSupabase = getAccountWriteClient();

  if (!writeSupabase) {
    return {
      error: NextResponse.json(
        { error: "Saving account strategy requires SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 },
      ),
    };
  }

  return { user, writeSupabase };
}
const allowedOfferTypes = new Set(["project", "retainer", "audit", "consulting", "hybrid"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const { accountId } = await params;
    const access = await requireManager(accountId);
    if (access.error) return access.error;

    const body = await request.json();
    const name = textValue(body.name);
    const requestedOfferType = textValue(body.offerType) || "project";
    const offerType = allowedOfferTypes.has(requestedOfferType) ? requestedOfferType : "project";
    const serviceLineId = nullableTextValue(body.serviceLineId);

    if (!name) {
      return NextResponse.json({ error: "Offer name is required." }, { status: 400 });
    }

    if (serviceLineId) {
      const { data: serviceLine } = await access.writeSupabase
        .from("service_lines")
        .select("id")
        .eq("id", serviceLineId)
        .eq("account_id", accountId)
        .maybeSingle();

      if (!serviceLine) {
        return NextResponse.json(
          { error: "Selected service line does not belong to this account." },
          { status: 400 },
        );
      }
    }

    const { data, error } = await access.writeSupabase
      .from("offers")
      .insert({
        account_id: accountId,
        user_id: access.user.id,
        service_line_id: serviceLineId,
        name,
        description: nullableTextValue(body.description),
        target_buyer_segments: lines(body.targetBuyerSegments),
        offer_type: offerType,
        primary_cta: nullableTextValue(body.primaryCta),
        outcome: nullableTextValue(body.outcome),
        price_notes: nullableTextValue(body.priceNotes),
        active: true,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ offer: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error saving offer." },
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
    const access = await requireManager(accountId);
    if (access.error) return access.error;

    const body = await request.json().catch(() => ({}));
    const id = textValue(body.id);

    if (!id) {
      return NextResponse.json({ error: "Offer id is required." }, { status: 400 });
    }

    const { data, error } = await access.writeSupabase
      .from("offers")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("account_id", accountId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ offer: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error removing offer." },
      { status: 500 },
    );
  }
}
