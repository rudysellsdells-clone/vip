import type { Json } from "@/types/database.types";
import type { createClient } from "@/lib/supabase/server";
import type { NormalizedZapierResult } from "./result-utils";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type SourceAssetSnapshot = {
  id?: unknown;
  assetType?: unknown;
  title?: unknown;
  content?: unknown;
  status?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function toPlainObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function getToolRunSourceAsset(input: unknown): SourceAssetSnapshot | null {
  if (!isRecord(input)) return null;
  if (isRecord(input.sourceAsset)) return input.sourceAsset;
  if (typeof input.assetId === "string") return { id: input.assetId };
  return null;
}

export function getToolRunSourceAssetId(input: unknown) {
  const sourceAsset = getToolRunSourceAsset(input);
  return sourceAsset && typeof sourceAsset.id === "string" ? sourceAsset.id : null;
}

export async function markSourceAssetAfterZapierExecution(input: {
  supabase: SupabaseServerClient;
  userId: string;
  toolRunInput: unknown;
  providerAction: string;
  normalizedResult: NormalizedZapierResult;
  assetStatus?: "approved" | "published" | "sent";
}) {
  const assetId = getToolRunSourceAssetId(input.toolRunInput);
  if (!assetId) return null;

  const { data: asset, error: assetError } = await input.supabase
    .from("generated_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (assetError || !asset) return null;

  const existingMetadata = toPlainObject(asset.metadata);
  const zapierExecutions = Array.isArray(existingMetadata.zapierExecutions)
    ? existingMetadata.zapierExecutions
    : [];

  const executionRecord = {
    providerAction: input.providerAction,
    externalId: input.normalizedResult.externalId,
    externalUrl: input.normalizedResult.externalUrl,
    summary: input.normalizedResult.summary,
    completedAt: new Date().toISOString(),
  };

  const nextMetadata = {
    ...existingMetadata,
    lastZapierExecution: executionRecord,
    zapierExecutions: [...zapierExecutions, executionRecord],
  };

  const { data: updatedAsset } = await input.supabase
    .from("generated_assets")
    .update({
      status: input.assetStatus ?? asset.status,
      metadata: toJson(nextMetadata),
    })
    .eq("id", asset.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  return updatedAsset;
}
