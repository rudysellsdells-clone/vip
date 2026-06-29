import { safePathSegment } from "@/lib/visual-assets/metadata";

export const CAMPAIGN_ASSETS_BUCKET = "campaign-assets";

function extensionFromContentType(contentType: string) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "png";
}

export async function storeGeneratedVisual(input: {
  adminSupabase: any;
  bytes: ArrayBuffer;
  contentType: string;
  accountId: string | null;
  campaignId: string | null;
  sourceAssetId: string;
  filePrefix?: string;
}) {
  const extension = extensionFromContentType(input.contentType);
  const accountSegment = input.accountId
    ? safePathSegment(input.accountId, "account")
    : "legacy-user-account";
  const campaignSegment = input.campaignId
    ? safePathSegment(input.campaignId, "campaign")
    : "no-campaign";
  const filePrefix = safePathSegment(input.filePrefix, "openai-visual");
  const fileName = `${Date.now()}-${globalThis.crypto.randomUUID()}-${filePrefix}.${extension}`;
  const storagePath = `accounts/${accountSegment}/campaigns/${campaignSegment}/assets/${safePathSegment(input.sourceAssetId, "asset")}/visuals/${fileName}`;

  const { error: uploadError } = await input.adminSupabase.storage
    .from(CAMPAIGN_ASSETS_BUCKET)
    .upload(storagePath, input.bytes, {
      contentType: input.contentType,
      upsert: false,
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
    contentType: input.contentType,
    fileName,
  };
}
