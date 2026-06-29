import { NextResponse } from "next/server";
import { getActiveWorkspaceForUser, activeWorkspaceManageRequiredMessage, activeWorkspaceRequiredMessage } from "@/lib/accounts/active-workspace";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { CONTENT_EXAMPLE_TYPES } from "@/lib/clone/defaults";
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

    const title = getString(body.title);
    const content = getString(body.content);
    const contentType = getString(body.content_type, "other");

    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required." },
        { status: 400 }
      );
    }

    if (!CONTENT_EXAMPLE_TYPES.includes(contentType as (typeof CONTENT_EXAMPLE_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid content_type." }, { status: 400 });
    }

    const { data: example, error: exampleError } = await supabase
      .from("content_examples")
      .insert({
        user_id: user.id,
        account_id: workspace.activeAccountId,
        title,
        source: getString(body.source, ""),
        content,
        content_type: contentType,
        tags: getTags(body.tags),
        approved: true,
      })
      .select("*")
      .single();

    if (exampleError) {
      return NextResponse.json({ error: exampleError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "content_example_created",
      title: "Content example created",
      description: title,
      metadata: {
        exampleId: example.id,
        accountId: workspace.activeAccountId,
        contentType,
      },
    });

    return NextResponse.json({ example });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error saving content example." },
      { status: 500 }
    );
  }
}
