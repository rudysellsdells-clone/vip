import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";

const OPPORTUNITY_TYPES = ["project", "retainer", "audit", "consulting", "hybrid"] as const;

const OPPORTUNITY_STAGES = [
  "new",
  "qualified",
  "discovery_scheduled",
  "proposal_needed",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "paused",
] as const;

function getString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length ? value.trim() : fallback;
}

function getOptionalString(value: unknown) {
  const result = getString(value);
  return result || null;
}

function getOptionalUuid(value: unknown) {
  return getOptionalString(value);
}

function getOpportunityType(value: unknown) {
  const type = getString(value, "project");

  if (OPPORTUNITY_TYPES.includes(type as (typeof OPPORTUNITY_TYPES)[number])) {
    return type;
  }

  return "project";
}

function getOpportunityStage(value: unknown) {
  const stage = getString(value, "new");

  if (OPPORTUNITY_STAGES.includes(stage as (typeof OPPORTUNITY_STAGES)[number])) {
    return stage;
  }

  return "new";
}

function getEstimatedValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

async function relatedRowBelongsToWorkspace({
  supabase,
  table,
  id,
  accountId,
}: {
  supabase: any;
  table: string;
  id: string | null;
  accountId: string;
}) {
  if (!id) return true;

  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("account_id", accountId)
    .maybeSingle();

  return Boolean(data);
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

    const name = getString(body.name);

    if (!name) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }

    const prospectId = getOptionalUuid(body.prospect_id);
    const serviceLineId = getOptionalUuid(body.service_line_id);
    const offerId = getOptionalUuid(body.offer_id);

    const [prospectOk, serviceLineOk, offerOk] = await Promise.all([
      relatedRowBelongsToWorkspace({ supabase, table: "prospects", id: prospectId, accountId: workspace.activeAccountId }),
      relatedRowBelongsToWorkspace({ supabase, table: "service_lines", id: serviceLineId, accountId: workspace.activeAccountId }),
      relatedRowBelongsToWorkspace({ supabase, table: "offers", id: offerId, accountId: workspace.activeAccountId }),
    ]);

    if (!prospectOk || !serviceLineOk || !offerOk) {
      return NextResponse.json(
        { error: "One or more linked records do not belong to the active workspace." },
        { status: 403 }
      );
    }

    const { data: opportunity, error: opportunityError } = await supabase
      .from("opportunities")
      .insert({
        user_id: user.id,
        account_id: workspace.activeAccountId,
        prospect_id: prospectId,
        name,
        service_line_id: serviceLineId,
        offer_id: offerId,
        opportunity_type: getOpportunityType(body.opportunity_type),
        estimated_value: getEstimatedValue(body.estimated_value),
        stage: getOpportunityStage(body.stage),
        next_step: getOptionalString(body.next_step),
        close_date: getOptionalString(body.close_date),
        notes: getOptionalString(body.notes),
      })
      .select("*")
      .single();

    if (opportunityError) {
      return NextResponse.json({ error: opportunityError.message }, { status: 400 });
    }

    if (prospectId) {
      await supabase
        .from("prospects")
        .update({
          status: "active_opportunity",
        })
        .eq("id", prospectId)
        .eq("account_id", workspace.activeAccountId);
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "opportunity_created",
      title: "Opportunity created",
      description: name,
      metadata: {
        opportunityId: opportunity.id,
        accountId: workspace.activeAccountId,
        prospectId,
        stage: opportunity.stage,
        estimatedValue: opportunity.estimated_value,
      },
    });

    return NextResponse.json({ opportunity });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error creating opportunity." },
      { status: 500 }
    );
  }
}
