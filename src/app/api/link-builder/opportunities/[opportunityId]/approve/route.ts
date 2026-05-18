import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chooseAnchorText } from "@/lib/link-builder/profile";

type RouteContext = { params: Promise<{ opportunityId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { opportunityId } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: opportunity } = await supabase.from("directory_opportunities").select("*").eq("id", opportunityId).eq("user_id", user.id).single();
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });

  const { data: profile } = await supabase.from("directory_profiles").select("*").eq("user_id", user.id).eq("active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Create a directory profile before approving opportunities." }, { status: 400 });

  const { data: submission, error } = await supabase.from("directory_submissions").insert({
    user_id: user.id,
    opportunity_id: opportunity.id,
    profile_id: profile.id,
    submission_url: opportunity.submit_url ?? opportunity.url,
    prepared_title: profile.business_name,
    prepared_description: profile.long_description || profile.short_description || "",
    prepared_category: opportunity.category ?? profile.categories?.[0] ?? null,
    prepared_anchor_text: chooseAnchorText(profile.anchor_text_options, profile.business_name),
    status: "ready_for_review",
    notes: "Prepared from the reusable directory profile.",
  }).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("directory_opportunities").update({ status: "approved" }).eq("id", opportunity.id).eq("user_id", user.id);
  await supabase.from("activity_log").insert({
    user_id: user.id,
    activity_type: "directory_opportunity_approved",
    title: "Directory opportunity approved",
    description: opportunity.directory_name ?? opportunity.domain,
    metadata: { opportunityId: opportunity.id, submissionId: submission.id },
  });

  return NextResponse.json({ submission });
}
