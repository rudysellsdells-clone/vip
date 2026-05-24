import { NextResponse } from "next/server";
import {
  buildWordPressExcerpt,
  formatBlogPostForWordPressHtml,
} from "@/lib/wordpress/html-formatter";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: asset, error } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .single();

  if (error || !asset) {
    return NextResponse.json(
      { error: error?.message ?? "Asset not found or has been archived." },
      { status: 404 }
    );
  }

  if (asset.asset_type !== "blog_post") {
    return NextResponse.json(
      { error: "Only blog posts can be previewed as WordPress HTML." },
      { status: 400 }
    );
  }

  const html = formatBlogPostForWordPressHtml({
    title: asset.title ?? "Untitled Blog Post",
    content: asset.content ?? "",
    includeDefaultCta: process.env.WORDPRESS_INCLUDE_DEFAULT_CTA !== "false",
  });

  return NextResponse.json({
    ok: true,
    asset: {
      id: asset.id,
      title: asset.title,
      asset_type: asset.asset_type,
      status: asset.status,
    },
    html,
    excerpt: buildWordPressExcerpt(html),
  });
}
