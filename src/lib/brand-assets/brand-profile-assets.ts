import { getAccountWriteClient } from "@/lib/accounts/account-utils";

export const BRAND_ASSETS_BUCKET = "brand-assets";

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

function safePathSegment(value: unknown, fallback: string) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return text || fallback;
}

function inferLogoContentType(fileName: string, contentType: string) {
  if (contentType && contentType !== "application/octet-stream") return contentType;

  const extension = fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "gif") return "image/gif";

  return contentType || "application/octet-stream";
}

function fileExtension(fileName: string, contentType: string) {
  const existing = fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();

  if (existing) return existing;
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/svg+xml") return "svg";
  if (contentType === "image/gif") return "gif";

  return "logo";
}

export function normalizeBrandColors(value: unknown) {
  const raw = Array.isArray(value) ? value.join("\n") : String(value ?? "");
  const candidates = raw
    .split(/\r?\n|,|;/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const colors: string[] = [];

  for (const candidate of candidates) {
    const cleaned = candidate.replace(/\s+/g, " ").trim();
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) continue;

    seen.add(key);
    colors.push(cleaned);
  }

  return colors;
}

export async function storeBrandLogo({
  accountId,
  file,
}: {
  accountId: string;
  file: File;
}) {
  if (!file.size) {
    return null;
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error("Logo must be 5MB or smaller.");
  }

  const originalName = file.name || "brand-logo";
  const contentType = inferLogoContentType(originalName, file.type || "application/octet-stream");

  if (!ALLOWED_LOGO_TYPES.has(contentType)) {
    throw new Error("Logo must be a PNG, JPG, WEBP, SVG, or GIF file.");
  }

  const writeSupabase = getAccountWriteClient();

  if (!writeSupabase) {
    throw new Error("Uploading brand logos requires SUPABASE_SERVICE_ROLE_KEY.");
  }

  const extension = fileExtension(originalName, contentType);
  const fileName = `${Date.now()}-${safePathSegment(originalName.replace(/\.[^.]+$/, ""), "brand-logo")}.${extension}`;
  const storagePath = `accounts/${safePathSegment(accountId, "account")}/brand/${fileName}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await writeSupabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = writeSupabase.storage
    .from(BRAND_ASSETS_BUCKET)
    .getPublicUrl(storagePath);

  return {
    bucket: BRAND_ASSETS_BUCKET,
    storagePath,
    publicUrl: publicUrlData.publicUrl,
    fileName: originalName,
    contentType,
    fileSizeBytes: file.size,
  };
}
