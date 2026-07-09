import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeRelatedAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";
import {
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

function actionFromBody(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const action = String((value as Record<string, unknown>).action ?? "").trim().toLowerCase();
    if (action === "approve" || action === "reject") return action;
  }

  return null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { assetId, visualAssetId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = actionFromBody(body);

    if (!action) {
      return NextResponse.json({ error: "A visual review action is required." }, { status: 400 });
    }

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
        { error: "You do not have permission to review visuals for this asset." },
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

    const adminSupabase = untypedSupabase(createAdminClient());
    const visualMetadata = jsonRecord(visualAsset.metadata);
    const publicUrl = visualUrlFromAsset(visualAsset as Record<string, unknown>);
    const now = new Date().toISOString();

    if (action === "approve") {
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

      const siblings = (siblingVisuals ?? []) as Array<Record<string, unknown>>;

      await Promise.all(
        siblings.map((sibling) => {
          const selected = String(sibling.id ?? "") === visualAssetId;
          const updateValues: Record<string, unknown> = {
            metadata: mergeVisualMetadata(
              sibling.metadata,
              selected
                ? {
                    isPrimary: true,
                    selectedForPublish: true,
                    publishReady: true,
                    reviewedAt: now,
                    reviewStatus: "approved",
                  }
                : {
                    isPrimary: false,
                    selectedForPublish: false,
                    publishReady: false,
                  },
            ),
            updated_at: now,
          };

          if (selected) {
            updateValues.status = "approved";
          }

          return adminSupabase
            .from("generated_assets")
            .update(updateValues)
            .eq("id", sibling.id);
        }),
      );

      await adminSupabase
        .from("generated_assets")
        .update({
          metadata: mergeVisualMetadata(assetAccess.asset.metadata, {
            primaryVisualAssetId: visualAsset.id,
            primaryVisualUrl: publicUrl,
            primaryVisualStoragePath: stringOrNull(visualMetadata.storagePath),
            primaryVisualProvider: stringOrNull(visualMetadata.provider) ?? "unknown",
            primaryVisualUse: stringOrNull(visualMetadata.imageUse),
            imageReadyForPublishing: Boolean(publicUrl),
          }),
          updated_at: now,
        })
        .eq("id", assetId);
    } else {
      await adminSupabase
        .from("generated_assets")
        .update({
          status: "rejected",
          metadata: mergeVisualMetadata(visualAsset.metadata, {
            isPrimary: false,
            selectedForPublish: false,
            publishReady: false,
            reviewedAt: now,
            reviewStatus: "rejected",
          }),
          updated_at: now,
        })
        .eq("id", visualAssetId);

      const wasPrimary =
        String(assetAccess.asset.metadata?.primaryVisualAssetId ?? "") === visualAssetId ||
        visualMetadata.isPrimary === true ||
        visualMetadata.selectedForPublish === true;

      if (wasPrimary) {
        await adminSupabase
          .from("generated_assets")
          .update({
            metadata: mergeVisualMetadata(assetAccess.asset.metadata, {
              primaryVisualAssetId: null,
              primaryVisualUrl: null,
              primaryVisualStoragePath: null,
              primaryVisualProvider: null,
              primaryVisualUse: null,
              imageReadyForPublishing: false,
            }),
            updated_at: now,
          })
          .eq("id", assetId);
      }
    }

    await supabase.from("approvals").insert({
      user_id: user.id,
      asset_id: visualAssetId,
      status: action === "approve" ? "approved" : "rejected",
      notes: action === "approve" ? "Visual approved." : "Visual rejected.",
      approved_at: action === "approve" ? now : null,
    });

    await logActivity(supabase, {
      userId: user.id,
      activityType: action === "approve" ? "visual_asset_approved" : "visual_asset_rejected",
      title: action === "approve" ? "Visual asset approved" : "Visual asset rejected",
      description:
        action === "approve"
          ? "A generated visual was approved and selected as the primary publishing image."
          : "A generated visual was rejected.",
      metadata: mergeVisualMetadata({}, {
        sourceAssetId: assetId,
        visualAssetId,
        publicUrl,
        accountId,
        campaignId: assetAccess.asset.campaign_id ?? null,
        action,
      }),
    });

    return NextResponse.json({ ok: true, action, visualAssetId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error reviewing visual asset.",
      },
      { status: 500 },
    );
  }
}
