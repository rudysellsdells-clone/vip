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

export function safePathSegment(value: unknown, fallback: string) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return text || fallback;
}
