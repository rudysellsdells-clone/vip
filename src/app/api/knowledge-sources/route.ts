import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { KNOWLEDGE_SOURCE_TYPES } from "@/lib/clone/defaults";
import { logActivity } from "@/lib/security/auditLog";

function getString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length ? value.trim() : fallback;
}

function getTags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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

    const title = getString(body.title);
    const content = getString(body.content);
    const sourceType = getString(body.source_type, "manual_note");

    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required." },
        { status: 400 }
      );
    }

    if (!KNOWLEDGE_SOURCE_TYPES.includes(sourceType as (typeof KNOWLEDGE_SOURCE_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid source_type." }, { status: 400 });
    }

    const { data: source, error: sourceError } = await supabase
      .from("knowledge_sources")
      .insert({
        user_id: user.id,
        title,
        source_type: sourceType,
        source_url: getString(body.source_url, ""),
        content,
        summary: getString(body.summary, ""),
        tags: getTags(body.tags),
        active: true,
      })
      .select("*")
      .single();

    if (sourceError) {
      return NextResponse.json({ error: sourceError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "knowledge_source_created",
      title: "Knowledge source created",
      description: title,
      metadata: {
        sourceId: source.id,
        sourceType,
      },
    });

    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error saving knowledge source." },
      { status: 500 }
    );
  }
}
