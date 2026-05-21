import { NextResponse } from "next/server";
import { generateWhatIfStory } from "@/lib/what-if-stories/generator";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function readForm(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function POST(request: Request) {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();

  const input = {
    prospectName: readForm(formData, "prospect_name"),
    businessName: readForm(formData, "business_name"),
    websiteUrl: readForm(formData, "website_url"),
    industry: readForm(formData, "industry"),
    location: readForm(formData, "location"),
    currentSituation: readForm(formData, "current_situation"),
    painPoint: readForm(formData, "pain_point"),
    opportunity: readForm(formData, "opportunity"),
    offerFocus: readForm(formData, "offer_focus"),
    tone: readForm(formData, "tone"),
    cta: readForm(formData, "cta"),
  };

  if (!input.businessName) {
    return NextResponse.json(
      { error: "Business name is required." },
      { status: 400 }
    );
  }

  try {
    const result = await generateWhatIfStory(input);

    const title = `What-If Success Story: ${input.businessName}`;

    const { data: asset, error: assetError } = await supabase
      .from("generated_assets")
      .insert({
        user_id: user.id,
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

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "what_if_story_generated",
      title: "What-If Success Story generated",
      description: input.businessName,
      metadata: {
        assetId: asset.id,
        prospectName: input.prospectName,
        businessName: input.businessName,
        websiteUrl: input.websiteUrl,
        industry: input.industry,
        location: input.location,
        offerFocus: input.offerFocus,
        model: result.model,
      },
    });

    return NextResponse.json({
      ok: true,
      asset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected What-If Story error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
