import { NextResponse } from "next/server";
import {
  generateAuthorityContent,
  type AuthorityContentInput,
} from "@/lib/authority-content/generator";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

const VALID_TYPES = new Set(["blog_post", "white_paper", "authority_asset"]);

function readForm(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function parseContentType(value: string): AuthorityContentInput["contentType"] {
  if (VALID_TYPES.has(value)) {
    return value as AuthorityContentInput["contentType"];
  }

  return "blog_post";
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

  const input: AuthorityContentInput = {
    contentType: parseContentType(readForm(formData, "content_type")),
    title: readForm(formData, "title"),
    topic: readForm(formData, "topic"),
    audience: readForm(formData, "audience"),
    businessGoal: readForm(formData, "business_goal"),
    offerFocus: readForm(formData, "offer_focus"),
    tone: readForm(formData, "tone"),
    cta: readForm(formData, "cta"),
    keywords: readForm(formData, "keywords"),
    notes: readForm(formData, "notes"),
  };

  if (!input.title || !input.topic) {
    return NextResponse.json(
      { error: "Title and topic are required." },
      { status: 400 }
    );
  }

  try {
    const result = await generateAuthorityContent(input);

    const { data: asset, error: assetError } = await supabase
      .from("generated_assets")
      .insert({
        user_id: user.id,
        campaign_id: null,
        asset_type: input.contentType,
        title: input.title,
        content: result.content,
        status: "needs_review",
        version: 1,
      })
      .select("*")
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { error: assetError?.message ?? "Unable to save authority content asset." },
        { status: 400 }
      );
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "authority_content_generated",
      title: "Authority content generated",
      description: input.title,
      metadata: {
        assetId: asset.id,
        contentType: input.contentType,
        topic: input.topic,
        audience: input.audience,
        businessGoal: input.businessGoal,
        offerFocus: input.offerFocus,
        model: result.model,
      },
    });

    return NextResponse.json({
      ok: true,
      asset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected authority content error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
