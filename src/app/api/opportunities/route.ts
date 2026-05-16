import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const name = getString(body.name);

    if (!name) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }

    const prospectId = getOptionalUuid(body.prospect_id);

    const { data: opportunity, error: opportunityError } = await supabase
      .from("opportunities")
      .insert({
        user_id: user.id,
        prospect_id: prospectId,
        name,
        service_line_id: getOptionalUuid(body.service_line_id),
        offer_id: getOptionalUuid(body.offer_id),
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
        .eq("user_id", user.id);
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "opportunity_created",
      title: "Opportunity created",
      description: name,
      metadata: {
        opportunityId: opportunity.id,
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
