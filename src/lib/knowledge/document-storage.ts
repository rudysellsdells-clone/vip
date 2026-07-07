import { getAccountWriteClient } from "@/lib/accounts/account-utils";

export const BRAND_KNOWLEDGE_BUCKET = "brand-knowledge";

function inferKnowledgeContentType(fileName: string, contentType: string) {
  if (contentType && contentType !== "application/octet-stream") return contentType;

  const extension = fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();

  if (extension === "pdf") return "application/pdf";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "txt") return "text/plain";

  return contentType || "application/octet-stream";
}

function safePathSegment(value: unknown, fallback: string) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return text || fallback;
}

export async function storeKnowledgeDocument({
  accountId,
  file,
}: {
  accountId: string;
  file: File;
}) {
  const writeSupabase = getAccountWriteClient();

  if (!writeSupabase) {
    throw new Error("Uploading knowledge documents requires SUPABASE_SERVICE_ROLE_KEY.");
  }

  const originalName = file.name || "knowledge-document";
  const fileName = `${Date.now()}-${safePathSegment(originalName, "knowledge-document")}`;
  const storagePath = `accounts/${safePathSegment(accountId, "account")}/knowledge/${fileName}`;
  const contentType = inferKnowledgeContentType(originalName, file.type || "application/octet-stream");
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await writeSupabase.storage
    .from(BRAND_KNOWLEDGE_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return {
    bucket: BRAND_KNOWLEDGE_BUCKET,
    storagePath,
    fileName: originalName,
    contentType,
    fileSizeBytes: file.size,
  };
}
