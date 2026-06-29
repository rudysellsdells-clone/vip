import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser } from "@/lib/accounts/active-workspace";
import { normalizeProspect } from "@/lib/prospects/normalizer";
import { generateWhatIfStory } from "@/lib/what-if-stories/generator";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    prospectId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { prospectId } = await context.params;
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
    return NextResponse.json({ error: "Select an active workspace before generating a What-If Story." }, { status: 409 });
  }

  const { data: prospectRow, error: prospectError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .eq("account_id", workspace.activeAccountId)
    .single();

  if (prospectError || !prospectRow) {
    return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  }

  const prospect = normalizeProspect(prospectRow);

  try {
    const result = await generateWhatIfStory({
      prospectName: prospect.prospectName,
      businessName: prospect.businessName,
      websiteUrl: prospect.websiteUrl,
      industry: prospect.industry,
      location: prospect.location,
      currentSituation: prospect.currentSituation,
      painPoint: prospect.painPoint,
      opportunity: prospect.opportunity,
      offerFocus: prospect.offerFocus,
      tone: "consultative and confident",
      cta: prospect.cta,
    });

    const title = `What-If Success Story: ${prospect.businessName}`;

    const { data: asset, error: assetError } = await supabase
      .from("generated_assets")
      .insert({
        user_id: user.id,
        account_id: workspace.activeAccountId,
        campaign_id: null,
        asset_type: "prospect_what_if_story",
        title,
        content: result.content,
        status: "needs_review",
        version: 1,
      })
      .select("*")
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { error: assetError?.message ?? "Unable to save What-If Story asset." },
        { status: 400 }
      );
    }

    const { error: linkError } = await supabase
      .from("prospect_asset_links")
      .upsert(
        {
          user_id: user.id,
          account_id: workspace.activeAccountId,
          prospect_id: prospect.id,
          asset_id: asset.id,
          relationship_type: "what_if_story",
          status: "active",
          metadata: {
            prospectName: prospect.prospectName,
            businessName: prospect.businessName,
            websiteUrl: prospect.websiteUrl,
            industry: prospect.industry,
            location: prospect.location,
            generatedAt: new Date().toISOString(),
          },
        },
        {
          onConflict: "user_id,prospect_id,asset_id,relationship_type",
        }
      );

    if (linkError) {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        account_id: workspace.activeAccountId,
        activity_type: "prospect_what_if_story_link_warning",
        title: "What-If Story generated but not linked",
        description: linkError.message,
        metadata: {
          accountId: workspace.activeAccountId,
          prospectId: prospect.id,
          assetId: asset.id,
          businessName: prospect.businessName,
        },
      });
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      account_id: workspace.activeAccountId,
      activity_type: "prospect_what_if_story_generated",
      title: "Prospect What-If Story generated",
      description: prospect.businessName,
      metadata: {
        accountId: workspace.activeAccountId,
        prospectId: prospect.id,
        assetId: asset.id,
        prospectName: prospect.prospectName,
        businessName: prospect.businessName,
        websiteUrl: prospect.websiteUrl,
        industry: prospect.industry,
        location: prospect.location,
        model: result.model,
        linkWarning: linkError?.message ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      asset,
      prospect,
      linkWarning: linkError?.message ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Prospect What-If Story error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
