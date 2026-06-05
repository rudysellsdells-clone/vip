import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { untypedSupabase } from "@/lib/supabase/untyped";
import {
  getGalaxyAiRun,
  getGalaxyAiWorkflowMedia,
} from "@/lib/galaxyai/client";
import { logActivity } from "@/lib/security/auditLog";
import type { GalaxyAiMediaItem } from "@/lib/galaxyai/types";
import type { Json } from "@/types/database.types";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

const CAMPAIGN_ASSETS_BUCKET =
  process.env.SUPABASE_CAMPAIGN_ASSETS_BUCKET || "campaign-assets";

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function normalizeGalaxyAiStatus(status: unknown) {
  if (typeof status !== "string") {
    return "running";
  }

  const normalized = status.toLowerCase();

  if (
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "completed" ||
    normalized === "failed" ||
    normalized === "canceled"
  ) {
    return normalized;
  }

  return "running";
}

function getFinishedAt(galaxyRun: Record<string, unknown>) {
  const possibleValues = [
    galaxyRun.finishedAt,
    galaxyRun.finished_at,
    galaxyRun.completedAt,
    galaxyRun.completed_at,
  ];

  const match = possibleValues.find((value) => typeof value === "string");

  return typeof match === "string" ? match : new Date().toISOString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getMediaUrls(mediaItems: GalaxyAiMediaItem[]) {
  return mediaItems
    .map((item) => item.url)
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0);
}

function isImageMediaItem(item: GalaxyAiMediaItem) {
  const type = String(item.type ?? "").toLowerCase();
  const url = String(item.url ?? "").toLowerCase();

  return (
    type.includes("image") ||
    /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(url)
  );
}

function filterMediaForRun(mediaItems: GalaxyAiMediaItem[], galaxyRunId: string) {
  return mediaItems.filter((item) => item.runId === galaxyRunId);
}

function safePathSegment(value: unknown, fallback: string) {
  const safe = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return safe || fallback;
}

function inferExtension(contentType: string | null, url: string) {
  const normalizedContentType = String(contentType ?? "").toLowerCase();

  if (normalizedContentType.includes("png")) return "png";
  if (normalizedContentType.includes("webp")) return "webp";
  if (normalizedContentType.includes("gif")) return "gif";
  if (normalizedContentType.includes("jpeg") || normalizedContentType.includes("jpg")) return "jpg";

  const urlMatch = url.match(/\.(png|jpe?g|webp|gif)(?:\?|#|$)/i);
  if (urlMatch?.[1]) {
    return urlMatch[1].toLowerCase().replace("jpeg", "jpg");
  }

  return "jpg";
}

function inferContentType(extension: string, responseContentType: string | null) {
  if (responseContentType && responseContentType.toLowerCase().startsWith("image/")) {
    return responseContentType.split(";")[0].trim();
  }

  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

function mergeMetadata(existing: unknown, patch: Record<string, unknown>) {
  return toJson({
    ...jsonRecord(existing),
    ...patch,
  });
}

async function uploadGalaxyAiImageToStorage(input: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  userId: string;
  accountId: string | null;
  campaignId: string | null;
  assetId: string;
  mediaItem: GalaxyAiMediaItem;
}) {
  const originalUrl = input.mediaItem.url;

  if (!originalUrl || typeof originalUrl !== "string") {
    return null;
  }

  const response = await fetch(originalUrl);

  if (!response.ok) {
    throw new Error(
      `Could not download GalaxyAI image: ${response.status} ${response.statusText}`
    );
  }

  const responseContentType = response.headers.get("content-type");
  const extension = inferExtension(responseContentType, originalUrl);
  const contentType = inferContentType(extension, responseContentType);
  const arrayBuffer = await response.arrayBuffer();

  const accountSegment = input.accountId
    ? safePathSegment(input.accountId, "account")
    : "unassigned-account";
  const campaignSegment = input.campaignId
    ? safePathSegment(input.campaignId, "campaign")
    : "unassigned-campaign";
  const fileName = `${Date.now()}-${safePathSegment(input.mediaItem.nodeLabel ?? input.mediaItem.nodeId, "galaxyai-image")}.${extension}`;
  const storagePath = `accounts/${accountSegment}/campaigns/${campaignSegment}/assets/${input.assetId}/${fileName}`;

  const { error: uploadError } = await input.adminSupabase.storage
    .from(CAMPAIGN_ASSETS_BUCKET)
    .upload(storagePath, arrayBuffer as ArrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = input.adminSupabase.storage
    .from(CAMPAIGN_ASSETS_BUCKET)
    .getPublicUrl(storagePath);

  return {
    bucket: CAMPAIGN_ASSETS_BUCKET,
    storagePath,
    publicUrl: publicUrlData.publicUrl,
    contentType,
    fileName,
  };
}

async function createGalaxyAiMediaAssetIfNeeded(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  campaignId: string | null;
  localRunId: string;
  galaxyRunId: string;
  workflowId: string;
  mediaItems: GalaxyAiMediaItem[];
  galaxyRun: unknown;
}) {
  if (!input.campaignId || input.mediaItems.length === 0) {
    return null;
  }

  const { data: existingAssets, error: existingError } = await input.supabase
    .from("generated_assets")
    .select("id, metadata")
    .eq("user_id", input.userId)
    .eq("campaign_id", input.campaignId)
    .eq("asset_type", "galaxyai_media");

  if (existingError) {
    throw new Error(existingError.message);
  }

  const alreadySaved = existingAssets?.some((asset) => {
    const metadata = isPlainObject(asset.metadata) ? asset.metadata : null;

    return metadata?.provider === "galaxyai" && metadata?.runId === input.galaxyRunId;
  });

  if (alreadySaved) {
    return null;
  }

  const urls = getMediaUrls(input.mediaItems);
  const content = urls.length
    ? urls.join("\n")
    : "GalaxyAI completed the run, but no media URLs were returned.";

  const { data: createdAsset, error: insertError } = await input.supabase
    .from("generated_assets")
    .insert({
      user_id: input.userId,
      campaign_id: input.campaignId,
      asset_type: "galaxyai_media",
      title: "GalaxyAI Generated Media",
      content,
      metadata: toJson({
        provider: "galaxyai",
        workflowId: input.workflowId,
        runId: input.galaxyRunId,
        localRunId: input.localRunId,
        media: input.mediaItems,
        galaxyRun: input.galaxyRun,
      }),
      status: "needs_review",
    })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return createdAsset;
}

async function createGeneratedSocialImageAssetIfNeeded(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  campaignId: string | null;
  localRun: Record<string, unknown>;
  localRunId: string;
  galaxyRunId: string;
  workflowId: string;
  mediaItems: GalaxyAiMediaItem[];
  galaxyRun: unknown;
}) {
  if (input.mediaItems.length === 0) {
    return null;
  }

  const runInput = jsonRecord(input.localRun.input);
  const isSocialImageRun =
    runInput.promptPurpose === "social_image_generation" ||
    runInput.assetType === "galaxyai_image_prompt";

  if (!isSocialImageRun) {
    return null;
  }

  const promptAssetId = stringOrNull(input.localRun.asset_id);

  if (!promptAssetId) {
    return null;
  }

  const readSupabase = untypedSupabase(input.supabase);
  const adminSupabase = untypedSupabase(createAdminClient());

  const { data: promptAsset, error: promptAssetError } = await readSupabase
    .from("generated_assets")
    .select("*")
    .eq("id", promptAssetId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (promptAssetError || !promptAsset) {
    throw new Error(promptAssetError?.message ?? "GalaxyAI image prompt asset not found.");
  }

  const promptMetadata = jsonRecord(promptAsset.metadata);
  const parentSocialAssetId =
    stringOrNull(promptAsset.parent_asset_id) ||
    stringOrNull(promptMetadata.sourceSocialAssetId) ||
    stringOrNull(runInput.parentAssetId);

  const primaryImage =
    input.mediaItems.find(isImageMediaItem) ?? input.mediaItems[0] ?? null;

  if (!primaryImage?.url) {
    return null;
  }

  const { data: existingAssets, error: existingError } = await readSupabase
    .from("generated_assets")
    .select("id, metadata")
    .eq("user_id", input.userId)
    .eq("asset_type", "generated_social_image")
    .eq("parent_asset_id", parentSocialAssetId ?? promptAsset.id);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = (existingAssets ?? []).find((asset: Record<string, unknown>) => {
    const metadata = jsonRecord(asset.metadata);
    return metadata.provider === "galaxyai" && metadata.runId === input.galaxyRunId;
  });

  if (existing) {
    return existing;
  }

  let hostedImage:
    | {
        bucket: string;
        storagePath: string;
        publicUrl: string;
        contentType: string;
        fileName: string;
      }
    | null = null;
  let hostingError: string | null = null;

  try {
    hostedImage = await uploadGalaxyAiImageToStorage({
      adminSupabase,
      userId: input.userId,
      accountId: stringOrNull(promptAsset.account_id),
      campaignId: input.campaignId ?? stringOrNull(promptAsset.campaign_id),
      assetId: promptAsset.id,
      mediaItem: primaryImage,
    });
  } catch (error) {
    hostingError = error instanceof Error ? error.message : "Unable to host GalaxyAI image.";
  }

  const finalImageUrl = hostedImage?.publicUrl ?? primaryImage.url;
  const imagePlatform =
    stringOrNull(runInput.imagePlatform) ||
    stringOrNull(promptMetadata.imagePlatform) ||
    "social";
  const imageFormat =
    stringOrNull(runInput.imageFormat) ||
    stringOrNull(promptMetadata.imageFormat) ||
    "square";
  const titlePlatform =
    imagePlatform === "linkedin"
      ? "LinkedIn"
      : imagePlatform === "facebook"
        ? "Facebook"
        : "Social";

  const generatedImageMetadata = {
    provider: "galaxyai",
    assetRole: "generated_social_image",
    runId: input.galaxyRunId,
    localRunId: input.localRunId,
    workflowId: input.workflowId,
    promptAssetId: promptAsset.id,
    parentSocialAssetId,
    imagePlatform,
    imageFormat,
    hostedImageUrl: hostedImage?.publicUrl ?? null,
    originalGalaxyAiImageUrl: primaryImage.url,
    storageBucket: hostedImage?.bucket ?? null,
    storagePath: hostedImage?.storagePath ?? null,
    contentType: hostedImage?.contentType ?? null,
    hostingStatus: hostedImage?.publicUrl ? "hosted" : "external_url_fallback",
    hostingError,
    mediaItem: primaryImage,
    allMediaItems: input.mediaItems,
  };

  const { data: createdImageAsset, error: insertError } = await adminSupabase
    .from("generated_assets")
    .insert({
      user_id: input.userId,
      account_id: promptAsset.account_id ?? null,
      campaign_id: input.campaignId ?? promptAsset.campaign_id ?? null,
      parent_asset_id: parentSocialAssetId ?? promptAsset.id,
      asset_type: "generated_social_image",
      title: `${titlePlatform} Generated Social Image`,
      content: finalImageUrl,
      metadata: toJson(generatedImageMetadata),
      status: "needs_review",
    })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  await adminSupabase
    .from("generated_assets")
    .update({
      metadata: mergeMetadata(promptAsset.metadata, {
        generatedSocialImageAssetId: createdImageAsset.id,
        generatedSocialImageUrl: finalImageUrl,
        hostedImageUrl: hostedImage?.publicUrl ?? null,
        originalGalaxyAiImageUrl: primaryImage.url,
        galaxyAiImageRunId: input.galaxyRunId,
        imageHostingStatus: hostedImage?.publicUrl ? "hosted" : "external_url_fallback",
        imageHostingError: hostingError,
      }),
    })
    .eq("id", promptAsset.id);

  if (parentSocialAssetId) {
    const { data: parentSocialAsset } = await adminSupabase
      .from("generated_assets")
      .select("id, metadata")
      .eq("id", parentSocialAssetId)
      .maybeSingle();

    if (parentSocialAsset) {
      await adminSupabase
        .from("generated_assets")
        .update({
          metadata: mergeMetadata(parentSocialAsset.metadata, {
            generatedSocialImageAssetId: createdImageAsset.id,
            generatedSocialImageUrl: finalImageUrl,
            hostedImageUrl: hostedImage?.publicUrl ?? null,
            originalGalaxyAiImageUrl: primaryImage.url,
            galaxyAiImagePromptAssetId: promptAsset.id,
            galaxyAiImageRunId: input.galaxyRunId,
            imagePlatform,
            imageFormat,
            imageReadyForPublishing: Boolean(finalImageUrl),
            imageHostingStatus: hostedImage?.publicUrl ? "hosted" : "external_url_fallback",
            imageHostingError: hostingError,
          }),
        })
        .eq("id", parentSocialAssetId);
    }
  }

  return createdImageAsset;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { data: localRun, error: localRunError } = await supabase
      .from("galaxyai_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!localRun && !localRunError) {
      const fallbackResult = await supabase
        .from("galaxyai_runs")
        .select("*")
        .eq("galaxy_run_id", runId)
        .eq("user_id", user.id)
        .maybeSingle();

      localRun = fallbackResult.data;
      localRunError = fallbackResult.error;
    }

    if (localRunError) {
      return NextResponse.json({ error: localRunError.message }, { status: 400 });
    }

    if (!localRun || !localRun.galaxy_run_id || !localRun.galaxy_workflow_id) {
      return NextResponse.json({ error: "GalaxyAI run not found." }, { status: 404 });
    }

    const galaxyRun = await getGalaxyAiRun(localRun.galaxy_run_id);
    const galaxyRunRecord = galaxyRun as Record<string, unknown>;
    const status = normalizeGalaxyAiStatus(galaxyRunRecord.status);
    const isFinished =
      status === "completed" || status === "failed" || status === "canceled";

    let matchedMedia: GalaxyAiMediaItem[] = [];
    let createdMediaAsset: Record<string, unknown> | null = null;
    let createdSocialImageAsset: Record<string, unknown> | null = null;

    if (status === "completed") {
      const workflowMedia = await getGalaxyAiWorkflowMedia(localRun.galaxy_workflow_id);
      matchedMedia = filterMediaForRun(workflowMedia.items ?? [], localRun.galaxy_run_id);

      createdSocialImageAsset = await createGeneratedSocialImageAssetIfNeeded({
        supabase,
        userId: user.id,
        campaignId: localRun.campaign_id,
        localRun: localRun as Record<string, unknown>,
        localRunId: localRun.id,
        galaxyRunId: localRun.galaxy_run_id,
        workflowId: localRun.galaxy_workflow_id,
        mediaItems: matchedMedia,
        galaxyRun,
      });

      if (!createdSocialImageAsset) {
        createdMediaAsset = await createGalaxyAiMediaAssetIfNeeded({
          supabase,
          userId: user.id,
          campaignId: localRun.campaign_id,
          localRunId: localRun.id,
          galaxyRunId: localRun.galaxy_run_id,
          workflowId: localRun.galaxy_workflow_id,
          mediaItems: matchedMedia,
          galaxyRun,
        });
      }
    }

    const { data: updatedRun, error: updateError } = await supabase
      .from("galaxyai_runs")
      .update({
        status,
        output: toJson({
          galaxyRun,
          media: matchedMedia,
          mediaAssetCreated: Boolean(createdMediaAsset),
          mediaAssetId: createdMediaAsset?.id ?? null,
          socialImageAssetCreated: Boolean(createdSocialImageAsset),
          socialImageAssetId: createdSocialImageAsset?.id ?? null,
          generatedImageUrl:
            stringOrNull(createdSocialImageAsset?.content) ??
            stringOrNull(createdSocialImageAsset?.metadata?.hostedImageUrl) ??
            null,
        }),
        error:
          typeof galaxyRunRecord.error === "string"
            ? galaxyRunRecord.error
            : null,
        completed_at: isFinished ? getFinishedAt(galaxyRunRecord) : null,
      })
      .eq("id", localRun.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      activityType: createdSocialImageAsset
        ? "galaxyai_social_image_stored"
        : "galaxyai_run_status_checked",
      title: createdSocialImageAsset
        ? "GalaxyAI social image stored"
        : "GalaxyAI run status checked",
      description:
        status === "completed"
          ? createdSocialImageAsset
            ? "GalaxyAI image run completed and social image asset was created."
            : `GalaxyAI run completed with ${matchedMedia.length} media item(s).`
          : `GalaxyAI run is ${status}.`,
      metadata: {
        localRunId: localRun.id,
        galaxyRunId: localRun.galaxy_run_id,
        status,
        mediaCount: matchedMedia.length,
        mediaAssetCreated: Boolean(createdMediaAsset),
        mediaAssetId: createdMediaAsset?.id ?? null,
        socialImageAssetCreated: Boolean(createdSocialImageAsset),
        socialImageAssetId: createdSocialImageAsset?.id ?? null,
      },
    });

    return NextResponse.json({
      run: updatedRun,
      galaxyRun,
      media: matchedMedia,
      createdMediaAsset,
      createdSocialImageAsset,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error checking GalaxyAI run." },
      { status: 500 }
    );
  }
}
