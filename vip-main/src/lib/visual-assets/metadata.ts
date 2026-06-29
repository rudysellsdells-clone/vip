import type { Json } from "@/types/database.types";

export type JsonRecord = Record<string, unknown>;

export function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export function stringOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function mergeVisualMetadata(existing: unknown, patch: JsonRecord): Json {
  return {
    ...jsonRecord(existing),
    ...patch,
  } as Json;
}

export function visualUrlFromAsset(asset: Record<string, unknown>) {
  const metadata = jsonRecord(asset.metadata);
  return (
    stringOrNull(metadata.publicUrl) ??
    stringOrNull(metadata.hostedImageUrl) ??
    stringOrNull(metadata.imageUrl) ??
    stringOrNull(asset.content)
  );
}

export function isPrimaryVisual(asset: Record<string, unknown>, primaryVisualAssetId?: string | null) {
  const metadata = jsonRecord(asset.metadata);
  return (
    String(asset.id ?? "") === String(primaryVisualAssetId ?? "") ||
    metadata.isPrimary === true ||
    metadata.selectedForPublish === true
  );
}

export function buildPublishingImageMetadataFromVisual(asset: Record<string, unknown>): JsonRecord {
  const metadata = jsonRecord(asset.metadata);
  const publicUrl = visualUrlFromAsset(asset);
  const visualAssetId = stringOrNull(asset.id);
  const imageUse = stringOrNull(metadata.imageUse);

  const patch: JsonRecord = {
    primaryVisualAssetId: visualAssetId,
    primaryVisualUrl: publicUrl,
    primaryVisualStoragePath: stringOrNull(metadata.storagePath),
    primaryVisualProvider: stringOrNull(metadata.provider) ?? "unknown",
    primaryVisualUse: imageUse,
    selectedVisualAssetId: visualAssetId,
    selectedVisualUrl: publicUrl,
    selectedImageUse: imageUse,
    imageReadyForPublishing: Boolean(publicUrl),
    hostedImageUrl: publicUrl,
    imageUrl: publicUrl,
    mediaUrl: publicUrl,
  };

  if (publicUrl) {
    patch.generatedSocialImageAssetId = visualAssetId;
    patch.generatedSocialImageUrl = publicUrl;
    patch.socialImageAssetId = visualAssetId;
    patch.socialImageUrl = publicUrl;
  }

  if (imageUse === "blog_featured_image") {
    patch.featuredImageAssetId = visualAssetId;
    patch.featuredImageUrl = publicUrl;
    patch.blogFeaturedImageUrl = publicUrl;
  }

  if (imageUse === "email_banner") {
    patch.emailBannerAssetId = visualAssetId;
    patch.emailBannerUrl = publicUrl;
  }

  if (imageUse === "linkedin_post") {
    patch.linkedinImageAssetId = visualAssetId;
    patch.linkedinImageUrl = publicUrl;
  }

  if (imageUse === "facebook_post") {
    patch.facebookImageAssetId = visualAssetId;
    patch.facebookImageUrl = publicUrl;
  }

  return patch;
}

export function safePathSegment(value: unknown, fallback: string) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return text || fallback;
}
