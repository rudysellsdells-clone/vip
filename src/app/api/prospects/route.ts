import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
import { logActivity } from "@/lib/security/auditLog";

const PROSPECT_STATUSES = [
  "new",
  "researching",
  "contacted",
  "qualified",
  "unqualified",
  "active_opportunity",
  "customer",
  "archived",
] as const;

function getString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length ? value.trim() : fallback;
}

function getOptionalString(value: unknown) {
  const result = getString(value);
  return result || null;
}

function getProspectStatus(value: unknown) {
  const status = getString(value, "new");

  if (PROSPECT_STATUSES.includes(status as (typeof PROSPECT_STATUSES)[number])) {
    return status;
  }

  return "new";
}

export async function POST(request: Request) {
  try {
    const supabase = untypedSupabase(await createClient());
    const body = await request.json().catch(() => ({}));

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getActiveWorkspaceForUser({ supabase, userId: user.id });

    if (!workspace) {
      return NextResponse.json({ error: activeWorkspaceRequiredMessage() }, { status: 400 });
    }

    if (!workspace.canManageActiveAccount) {
      return NextResponse.json({ error: activeWorkspaceManageRequiredMessage() }, { status: 403 });
    }

    const companyName = getString(body.company_name);

    if (!companyName) {
      return NextResponse.json(
        { error: "company_name is required." },
        { status: 400 }
      );
    }

    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .insert({
        user_id: user.id,
        account_id: workspace.activeAccountId,
        company_name: companyName,
        contact_name: getOptionalString(body.contact_name),
        email: getOptionalString(body.email),
        phone: getOptionalString(body.phone),
        website: getOptionalString(body.website),
        industry: getOptionalString(body.industry),
        buyer_segment: getOptionalString(body.buyer_segment),
        source: getOptionalString(body.source),
        notes: getOptionalString(body.notes),
        status: getProspectStatus(body.status),
      })
      .select("*")
      .single();

    if (prospectError) {
      return NextResponse.json({ error: prospectError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "prospect_created",
      title: "Prospect created",
      description: companyName,
      metadata: {
        prospectId: prospect.id,
        accountId: workspace.activeAccountId,
        status: prospect.status,
        buyerSegment: prospect.buyer_segment,
      },
    });

    return NextResponse.json({ prospect });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error creating prospect." },
      { status: 500 }
    );
  }
}
