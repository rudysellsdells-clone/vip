import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
import { DEFAULT_DIGITAL_CLONE_PROFILE } from "@/lib/clone/defaults";
import { logActivity } from "@/lib/security/auditLog";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

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

    const payload = {
      user_id: user.id,
      account_id: workspace.activeAccountId,
      name: getString(body.name, DEFAULT_DIGITAL_CLONE_PROFILE.name),
      purpose: getString(body.purpose, DEFAULT_DIGITAL_CLONE_PROFILE.purpose),
      voice_summary: getString(body.voice_summary, DEFAULT_DIGITAL_CLONE_PROFILE.voice_summary),
      business_summary: getString(body.business_summary, DEFAULT_DIGITAL_CLONE_PROFILE.business_summary),
      audience_summary: getString(body.audience_summary, DEFAULT_DIGITAL_CLONE_PROFILE.audience_summary),
      offer_summary: getString(body.offer_summary, DEFAULT_DIGITAL_CLONE_PROFILE.offer_summary),
      sales_outcome_summary: getString(
        body.sales_outcome_summary,
        DEFAULT_DIGITAL_CLONE_PROFILE.sales_outcome_summary
      ),
      approval_rules: DEFAULT_DIGITAL_CLONE_PROFILE.approval_rules,
      forbidden_actions: DEFAULT_DIGITAL_CLONE_PROFILE.forbidden_actions,
      preferred_style: DEFAULT_DIGITAL_CLONE_PROFILE.preferred_style,
      active: true,
    };

    const { data: existingProfile } = await supabase
      .from("digital_clone_profiles")
      .select("id")
      .eq("account_id", workspace.activeAccountId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const query = existingProfile?.id
      ? supabase
          .from("digital_clone_profiles")
          .update(payload)
          .eq("id", existingProfile.id)
          .eq("account_id", workspace.activeAccountId)
          .select("*")
          .single()
      : supabase.from("digital_clone_profiles").insert(payload).select("*").single();

    const { data: profile, error: profileError } = await query;

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "digital_clone_profile_updated",
      title: "Digital clone profile updated",
      description: "Updated the active workspace Marketing Twin profile.",
      metadata: {
        profileId: profile.id,
        accountId: workspace.activeAccountId,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error saving digital clone profile." },
      { status: 500 }
    );
  }
}
