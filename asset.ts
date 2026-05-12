import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCampaignSchema } from "@/lib/validation/campaignSchemas";
import { logActivity } from "@/lib/security/auditLog";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const input = createCampaignSchema.parse(body);

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: "Rudy McCormick",
      timezone: "America/Chicago"
    });

    const notesWithServiceLine = [
      input.serviceLine ? `Service line: ${input.serviceLine}` : null,
      input.notes || null
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        service_line_id: input.serviceLineId ?? null,
        offer_id: input.offerId ?? null,
        name: input.name,
        idea: input.idea,
        buyer_segment: input.buyerSegment,
        audience: input.audience ?? input.buyerSegment,
        goal: input.goal,
        platforms: input.platforms,
        tone: input.tone ?? "Clear, practical, confident",
        cta: input.cta,
        notes: notesWithServiceLine || null,
        status: "draft"
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "campaign_created",
      title: "Campaign created",
      description: `Created campaign: ${campaign.name}`,
      metadata: { campaignId: campaign.id }
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error creating campaign." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error loading campaigns." },
      { status: 500 }
    );
  }
}
