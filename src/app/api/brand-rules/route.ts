import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";

function getString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length ? value.trim() : fallback;
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

    const category = getString(body.category, "voice");
    const ruleText = getString(body.rule_text);
    const priority =
      typeof body.priority === "number" && Number.isFinite(body.priority)
        ? body.priority
        : 1;

    if (!ruleText) {
      return NextResponse.json({ error: "rule_text is required." }, { status: 400 });
    }

    const { data: rule, error: ruleError } = await supabase
      .from("brand_rules")
      .insert({
        user_id: user.id,
        account_id: workspace.activeAccountId,
        category,
        rule_text: ruleText,
        priority,
        active: true,
      })
      .select("*")
      .single();

    if (ruleError) {
      return NextResponse.json({ error: ruleError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "brand_rule_created",
      title: "Brand rule created",
      description: ruleText,
      metadata: {
        ruleId: rule.id,
        accountId: workspace.activeAccountId,
        category,
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error saving brand rule." },
      { status: 500 }
    );
  }
}
