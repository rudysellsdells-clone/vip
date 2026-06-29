import { NextResponse } from "next/server";
import { getAssetAccessForUser, scopeRelatedAssetQueryForAccess } from "@/lib/accounts/asset-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";
import { logActivity } from "@/lib/security/auditLog";
import { buildVisualAssetPrompt, normalizeImageUse, suggestedImageSize } from "@/lib/visual-assets/prompt-builder";
import { generateOpenAiImage } from "@/lib/visual-assets/openai-image";
import { storeGeneratedVisual } from "@/lib/visual-assets/storage";
import { buildPublishingImageMetadataFromVisual, jsonRecord, mergeVisualMetadata, stringOrNull } from "@/lib/visual-assets/metadata";

const VISUAL_ASSET_TYPES = ["generated_visual", "generated_social_image"];
const VISUAL_ELIGIBLE_STATUSES = new Set([
  "approved",
  "scheduled",
  "ready_for_publishing",
  "publish_ready",
  "published",
]);

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

function toJsonRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function visualGenerationAllowed(status: unknown) {
  return VISUAL_ELIGIBLE_STATUSES.has(String(status ?? "").trim().toLowerCase());
}

function visualTitleForUse(imageUse: string) {
  if (imageUse === "linkedin_post") return "LinkedIn Generated Image";
  if (imageUse === "facebook_post") return "Facebook Generated Image";
  if (imageUse === "blog_featured_image") return "Blog Featured Image";
  if (imageUse === "email_banner") return "Email Banner Image";
  return "Generated Social Image";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { assetId } = await context.params;
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
        { error: "You do not have permission to generate visuals for this asset." },
        { status: 403 },
      );
    }

    const asset = assetAccess.asset;
    const accountId = assetAccess.accountId;

    if (!visualGenerationAllowed(asset.status)) {
      return NextResponse.json(
        {
          error:
            "Approve this asset before generating a publish-ready image. VIP only creates visuals for approved or scheduled assets.",
        },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const imageUse = normalizeImageUse(toJsonRecord(body).imageUse, asset.asset_type);

    const [{ data: account }, { data: brandProfile }, campaignResult, existingVisualsResult] = await Promise.all([
      accountId
        ? supabase.from("accounts").select("*").eq("id", accountId).maybeSingle()
        : Promise.resolve({ data: null }),
      accountId
        ? supabase.from("account_brand_profiles").select("*").eq("account_id", accountId).maybeSingle()
        : Promise.resolve({ data: null }),
      asset.campaign_id
        ? scopeRelatedAssetQueryForAccess({
            query: supabase.from("campaigns").select("*").eq("id", asset.campaign_id),
            accountId,
            userId: user.id,
          }).maybeSingle()
        : Promise.resolve({ data: null }),
      scopeRelatedAssetQueryForAccess({
        query: supabase
          .from("generated_assets")
          .select("id,metadata")
          .eq("parent_asset_id", asset.id)
          .in("asset_type", VISUAL_ASSET_TYPES),
        accountId,
        userId: user.id,
      }),
    ]);

    const campaign = campaignResult.data ?? null;
    const existingVisuals = (existingVisualsResult.data ?? []) as Array<Record<string, unknown>>;
    const prompt = buildVisualAssetPrompt({
      asset,
      campaign,
      account,
      brandProfile,
      imageUse,
    });
    const imageSize = suggestedImageSize(imageUse);
    const image = await generateOpenAiImage({ prompt, size: imageSize });
    const adminSupabase = untypedSupabase(createAdminClient());

    const stored = await storeGeneratedVisual({
      adminSupabase,
      bytes: image.bytes,
      contentType: image.contentType,
      accountId,
      campaignId: stringOrNull(asset.campaign_id),
      sourceAssetId: asset.id,
      filePrefix: imageUse,
    });

    const existingPrimary = existingVisuals.some((visual) => {
      const metadata = jsonRecord(visual.metadata);
      return metadata.isPrimary === true || metadata.selectedForPublish === true;
    });
    const shouldMakePrimary = !existingPrimary && existingVisuals.length === 0;
    const version = existingVisuals.length + 1;

    const visualMetadata = mergeVisualMetadata({}, {
      provider: "openai",
      assetRole: "generated_visual",
      hVersion: "H1.5A",
      sourceAssetId: asset.id,
      sourceAssetType: asset.asset_type,
      sourceAssetTitle: asset.title ?? null,
      imageUse,
      prompt,
      model: image.model,
      size: image.size,
      storageBucket: stored.bucket,
      storagePath: stored.storagePath,
      publicUrl: stored.publicUrl,
      contentType: stored.contentType,
      fileName: stored.fileName,
      isPrimary: shouldMakePrimary,
      selectedForPublish: shouldMakePrimary,
      publishReady: shouldMakePrimary,
      createdFromStatus: asset.status,
    });

    const { data: createdVisual, error: insertError } = await adminSupabase
      .from("generated_assets")
      .insert({
        user_id: user.id,
        account_id: accountId,
        campaign_id: asset.campaign_id ?? null,
        parent_asset_id: asset.id,
        asset_type: "generated_visual",
        title: visualTitleForUse(imageUse),
        content: stored.publicUrl,
        metadata: visualMetadata,
        status: "stored",
        version,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    if (shouldMakePrimary) {
      await adminSupabase
        .from("generated_assets")
        .update({
          metadata: mergeVisualMetadata(asset.metadata, {
            ...buildPublishingImageMetadataFromVisual(createdVisual as Record<string, unknown>),
            visualAssetCount: version,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", asset.id);
    } else {
      await adminSupabase
        .from("generated_assets")
        .update({
          metadata: mergeVisualMetadata(asset.metadata, {
            visualAssetCount: version,
            latestVisualAssetId: createdVisual.id,
            latestVisualUrl: stored.publicUrl,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", asset.id);
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: "visual_asset_generated",
      title: "Visual asset generated",
      description: `Generated a ${imageUse.replaceAll("_", " ")} for ${asset.title ?? "an asset"}.`,
      metadata: mergeVisualMetadata({}, {
        sourceAssetId: asset.id,
        visualAssetId: createdVisual.id,
        accountId,
        campaignId: asset.campaign_id ?? null,
        imageUse,
        publicUrl: stored.publicUrl,
      }),
    });

    return NextResponse.json({
      visualAsset: createdVisual,
      publicUrl: stored.publicUrl,
      isPrimary: shouldMakePrimary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error generating visual asset.",
      },
      { status: 500 },
    );
  }
}
