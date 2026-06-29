import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
import {
  buildSubmissionDescription,
  chooseAnchorText,
} from "@/lib/link-builder/listing-profile";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    opportunityId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { opportunityId } = await context.params;
  const supabase = untypedSupabase(await createClient());

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

  const { data: opportunity, error: opportunityError } = await supabase
    .from("directory_opportunities")
    .select("*")
    .eq("id", opportunityId)
    .eq("account_id", workspace.activeAccountId)
    .single();

  if (opportunityError || !opportunity) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("directory_profiles")
    .select("*")
    .eq("account_id", workspace.activeAccountId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Create a directory profile before approving opportunities." },
      { status: 400 }
    );
  }

  const preparedDescription = buildSubmissionDescription({
    directoryName: opportunity.directory_name,
    shortDescription: profile.short_description,
    longDescription: profile.long_description,
  });

  const preparedAnchorText = chooseAnchorText(
    profile.anchor_text_options ?? [],
    profile.business_name
  );

  const { data: submission, error: submissionError } = await supabase
    .from("directory_submissions")
    .insert({
      user_id: user.id,
      account_id: workspace.activeAccountId,
      opportunity_id: opportunity.id,
      profile_id: profile.id,
      submission_url: opportunity.submit_url ?? opportunity.url,
      prepared_title: profile.business_name,
      prepared_description: preparedDescription,
      prepared_category: opportunity.category ?? (profile.categories ?? [])[0] ?? null,
      prepared_anchor_text: preparedAnchorText,
      status: "ready_for_review",
      notes: "Prepared from the reusable directory profile.",
    })
    .select("*")
    .single();

  if (submissionError) {
    return NextResponse.json({ error: submissionError.message }, { status: 400 });
  }

  await supabase
    .from("directory_opportunities")
    .update({
      status: "approved",
    })
    .eq("id", opportunity.id)
    .eq("account_id", workspace.activeAccountId);

  await supabase.from("activity_log").insert({
    user_id: user.id,
    account_id: workspace.activeAccountId,
    activity_type: "directory_opportunity_approved",
    title: "Directory opportunity approved",
    description: opportunity.directory_name ?? opportunity.domain,
    metadata: {
      opportunityId: opportunity.id,
      submissionId: submission.id,
    },
  });

  return NextResponse.json({ submission });
}
