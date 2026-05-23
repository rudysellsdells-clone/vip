import { NextResponse } from "next/server";
import { generateRepurposingPack } from "@/lib/content-repurposing/generator";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

const SOURCE_TYPES = new Set([
  "blog_post",
  "white_paper",
  "authority_asset",
  "prospect_what_if_story",
]);

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sourceAsset, error: sourceError } = await supabase
    .from("generated_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .single();

  if (sourceError || !sourceAsset) {
    return NextResponse.json(
      { error: "Source asset not found or has been archived." },
      { status: 404 }
    );
  }

  if (!SOURCE_TYPES.has(sourceAsset.asset_type)) {
    return NextResponse.json(
      {
        error:
          "This asset type is not currently supported for repurposing. Use a blog post, white paper, authority asset, or What-If Story.",
      },
      { status: 400 }
    );
  }

  try {
    const pack = await generateRepurposingPack({
      id: sourceAsset.id,
      title: sourceAsset.title ?? "Untitled authority asset",
      asset_type: sourceAsset.asset_type,
      content: sourceAsset.content ?? "",
      campaign_id: sourceAsset.campaign_id ?? null,
    });

    const rows = pack.drafts.map((draft) => ({
      user_id: user.id,
      campaign_id: sourceAsset.campaign_id ?? null,
      asset_type: draft.assetType,
      title: draft.title,
      content: [
        `Source asset: ${sourceAsset.title ?? sourceAsset.id}`,
        `Source asset ID: ${sourceAsset.id}`,
        "",
        draft.content,
      ].join("\n"),
      status: "needs_review",
      version: 1,
    }));

    const { data: createdAssets, error: insertError } = await supabase
      .from("generated_assets")
      .insert(rows)
      .select("*");

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    await supabase.from("activity_log").insert({
      user_id: user.id,
      activity_type: "content_repurposing_pack_generated",
      title: "Content repurposing pack generated",
      description: sourceAsset.title,
      metadata: {
        sourceAssetId: sourceAsset.id,
        sourceAssetType: sourceAsset.asset_type,
        createdAssetIds: (createdAssets ?? []).map((asset: Record<string, any>) => asset.id),
        createdAssetTypes: (createdAssets ?? []).map((asset: Record<string, any>) => asset.asset_type),
        model: pack.model,
      },
    });

    return NextResponse.json({
      ok: true,
      sourceAsset,
      assets: createdAssets ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected repurposing error.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
