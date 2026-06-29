import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeRelatedAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";
import {
  buildPublishingImageMetadataFromVisual,
  jsonRecord,
  mergeVisualMetadata,
  stringOrNull,
  visualUrlFromAsset,
} from "@/lib/visual-assets/metadata";

const VISUAL_ASSET_TYPES = ["generated_visual", "generated_social_image"];

type RouteContext = {
  params: Promise<{
    assetId: string;
    visualAssetId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { assetId, visualAssetId } = await context.params;
    const supabase = untypedSupabase(await createClient());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assetAccess = await getAssetAccessForUser({ supabase, assetId, userId: user.id });

    if (!assetAccess.asset || !assetAccess.canManage) {
      return NextResponse.json(
        { error: "You do not have permission to choose a primary visual for this asset." },
        { status: 403 },
      );
    }

    const accountId = assetAccess.accountId;

    const { data: visualAsset, error: visualError } = await scopeRelatedAssetQueryForAccess({
      query: supabase
        .from("generated_assets")
        .select("*")
        .eq("id", visualAssetId)
        .eq("parent_asset_id", assetId)
        .in("asset_type", VISUAL_ASSET_TYPES),
      accountId,
      userId: user.id,
    }).maybeSingle();

    if (visualError) {
      return NextResponse.json({ error: visualError.message }, { status: 400 });
    }

    if (!visualAsset) {
      return NextResponse.json({ error: "Visual asset not found." }, { status: 404 });
    }

    const { data: siblingVisuals, error: siblingsError } = await scopeRelatedAssetQueryForAccess({
      query: supabase
        .from("generated_assets")
        .select("id,metadata")
        .eq("parent_asset_id", assetId)
        .in("asset_type", VISUAL_ASSET_TYPES),
      accountId,
      userId: user.id,
    });

    if (siblingsError) {
      return NextResponse.json({ error: siblingsError.message }, { status: 400 });
    }

    const adminSupabase = untypedSupabase(createAdminClient());
    const siblings = (siblingVisuals ?? []) as Array<Record<string, unknown>>;

    await Promise.all(
      siblings.map((sibling) =>
        adminSupabase
          .from("generated_assets")
          .update({
            metadata: mergeVisualMetadata(sibling.metadata, {
              isPrimary: String(sibling.id ?? "") === visualAssetId,
              selectedForPublish: String(sibling.id ?? "") === visualAssetId,
              publishReady: String(sibling.id ?? "") === visualAssetId,
            }),
            updated_at: new Date().toISOString(),
          })
          .eq("id", sibling.id),
      ),
    );

    const publicUrl = visualUrlFromAsset(visualAsset as Record<string, unknown>);
    const visualMetadata = jsonRecord(visualAsset.metadata);

    await adminSupabase
      .from("generated_assets")
      .update({
        metadata: mergeVisualMetadata(assetAccess.asset.metadata, {
          ...buildPublishingImageMetadataFromVisual(visualAsset as Record<string, unknown>),
          primaryVisualStoragePath: stringOrNull(visualMetadata.storagePath),
          primaryVisualProvider: stringOrNull(visualMetadata.provider) ?? "unknown",
          primaryVisualUse: stringOrNull(visualMetadata.imageUse),
          imageReadyForPublishing: Boolean(publicUrl),
          visualAssetCount: siblings.length,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId);

    await logActivity(supabase, {
      userId: user.id,
      activityType: "visual_asset_primary_selected",
      title: "Primary visual selected",
      description: "A visual asset was selected as the primary publish image.",
      metadata: mergeVisualMetadata({}, {
        sourceAssetId: assetId,
        visualAssetId,
        publicUrl,
        accountId,
      }),
    });

    return NextResponse.json({
      ok: true,
      visualAssetId,
      publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error selecting primary visual.",
      },
      { status: 500 },
    );
  }
}
