import { NextResponse } from "next/server";
import {
  getAnalyticsEventDefinition,
  isAnalyticsEventName,
} from "@/lib/analytics/event-taxonomy";
import {
  AnalyticsHttpError,
  errorMessage,
  errorStatus,
  optionalUuid,
  requireAnalyticsAccountManager,
  textValue,
} from "@/lib/analytics/server";

export const runtime = "nodejs";

const GOAL_TYPES = new Set(["engagement", "lead", "conversion", "revenue"]);

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function moneyValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 999999999999) {
    throw new AnalyticsHttpError("Enter a valid non-negative goal value.");
  }
  return Math.round(parsed * 100) / 100;
}

async function clearOtherPrimaryGoals(admin: any, accountId: string, goalId?: string | null) {
  let query = admin
    .from("analytics_goals")
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("is_primary", true);

  if (goalId) query = query.neq("id", goalId);
  const { error } = await query;
  if (error) throw new AnalyticsHttpError(error.message);
}

export async function POST(request: Request) {
  try {
    const { admin, accountId, user } = await requireAnalyticsAccountManager();
    const body = (await request.json()) as Record<string, unknown>;
    const eventName = textValue(body.eventName, 80);

    if (!isAnalyticsEventName(eventName)) {
      throw new AnalyticsHttpError("Select a supported Marketing VIP event.");
    }

    const definition = getAnalyticsEventDefinition(eventName);
    const requestedType = textValue(body.goalType, 30).toLowerCase();
    const goalType = GOAL_TYPES.has(requestedType)
      ? requestedType
      : definition?.category ?? "conversion";
    const name = textValue(body.name, 120) || definition?.label || eventName;
    const isPrimary = booleanValue(body.isPrimary);

    if (isPrimary) await clearOtherPrimaryGoals(admin, accountId);

    const { data, error } = await admin
      .from("analytics_goals")
      .insert({
        account_id: accountId,
        name,
        description: textValue(body.description, 500) || null,
        event_name: eventName,
        goal_type: goalType,
        is_primary: isPrimary,
        is_active: true,
        default_value: moneyValue(body.defaultValue),
        currency_code: textValue(body.currencyCode, 3).toUpperCase() || "USD",
        created_by: user.id,
        updated_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      const message = String(error.message ?? "");
      if (message.toLowerCase().includes("duplicate")) {
        throw new AnalyticsHttpError("A goal already exists for that event.");
      }
      throw new AnalyticsHttpError(message || "Goal creation failed.");
    }

    return NextResponse.json({ goal: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Analytics goal creation failed.") },
      { status: errorStatus(error) },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { admin, accountId, user } = await requireAnalyticsAccountManager();
    const body = (await request.json()) as Record<string, unknown>;
    const goalId = optionalUuid(body.goalId);

    if (!goalId) throw new AnalyticsHttpError("A valid goal ID is required.");

    const { data: existing, error: existingError } = await admin
      .from("analytics_goals")
      .select("id,event_name,goal_type,is_primary,is_active")
      .eq("id", goalId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (existingError) throw new AnalyticsHttpError(existingError.message);
    if (!existing) throw new AnalyticsHttpError("Analytics goal was not found.", 404);

    const requestedType = textValue(body.goalType, 30).toLowerCase();
    const isPrimary =
      typeof body.isPrimary === "boolean" ? body.isPrimary : Boolean(existing.is_primary);

    if (isPrimary) await clearOtherPrimaryGoals(admin, accountId, goalId);

    const update: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
      is_primary: isPrimary,
    };

    if (typeof body.name === "string") update.name = textValue(body.name, 120);
    if (typeof body.description === "string") {
      update.description = textValue(body.description, 500) || null;
    }
    if (GOAL_TYPES.has(requestedType)) update.goal_type = requestedType;
    if (typeof body.isActive === "boolean") update.is_active = body.isActive;
    if (Object.prototype.hasOwnProperty.call(body, "defaultValue")) {
      update.default_value = moneyValue(body.defaultValue);
    }
    if (typeof body.currencyCode === "string") {
      update.currency_code = textValue(body.currencyCode, 3).toUpperCase() || "USD";
    }

    const { data, error } = await admin
      .from("analytics_goals")
      .update(update)
      .eq("id", goalId)
      .eq("account_id", accountId)
      .select("*")
      .single();

    if (error) throw new AnalyticsHttpError(error.message);
    return NextResponse.json({ goal: data });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Analytics goal update failed.") },
      { status: errorStatus(error) },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { admin, accountId } = await requireAnalyticsAccountManager();
    const body = (await request.json()) as Record<string, unknown>;
    const goalId = optionalUuid(body.goalId);

    if (!goalId) throw new AnalyticsHttpError("A valid goal ID is required.");

    const { error } = await admin
      .from("analytics_goals")
      .delete()
      .eq("id", goalId)
      .eq("account_id", accountId);

    if (error) throw new AnalyticsHttpError(error.message);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Analytics goal deletion failed.") },
      { status: errorStatus(error) },
    );
  }
}
