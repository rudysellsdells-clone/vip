import { jsonRecord, stringOrNull } from "@/lib/visual-assets/metadata";

export type VisualImageUse =
  | "auto"
  | "social_square"
  | "linkedin_post"
  | "facebook_post"
  | "blog_featured_image"
  | "email_banner";

export type VisualPromptContext = {
  asset: Record<string, unknown>;
  campaign?: Record<string, unknown> | null;
  account?: Record<string, unknown> | null;
  brandProfile?: Record<string, unknown> | null;
  imageUse?: VisualImageUse;
};

function compactText(value: unknown, fallback = "Not provided") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function truncate(value: unknown, max = 1800) {
  const text = compactText(value, "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function normalizeImageUse(value: unknown, assetType?: unknown): VisualImageUse {
  const raw = String(value ?? "").trim().toLowerCase();

  if (
    raw === "social_square" ||
    raw === "linkedin_post" ||
    raw === "facebook_post" ||
    raw === "blog_featured_image" ||
    raw === "email_banner"
  ) {
    return raw;
  }

  const type = String(assetType ?? "").trim().toLowerCase();
  if (type.includes("linkedin")) return "linkedin_post";
  if (type.includes("facebook")) return "facebook_post";
  if (type.includes("blog") || type.includes("authority")) return "blog_featured_image";
  if (type.includes("email")) return "email_banner";

  return "social_square";
}

export function imageUseLabel(value: VisualImageUse) {
  switch (value) {
    case "linkedin_post":
      return "LinkedIn post image";
    case "facebook_post":
      return "Facebook post image";
    case "blog_featured_image":
      return "blog featured image";
    case "email_banner":
      return "email banner image";
    case "social_square":
    case "auto":
    default:
      return "social post image";
  }
}

export function suggestedImageSize(value: VisualImageUse) {
  if (value === "blog_featured_image" || value === "email_banner") {
    return process.env.OPENAI_IMAGE_WIDE_SIZE || process.env.OPENAI_IMAGE_SIZE || "1024x1024";
  }

  return process.env.OPENAI_IMAGE_SIZE || "1024x1024";
}

export function buildVisualAssetPrompt(input: VisualPromptContext) {
  const asset = input.asset;
  const campaign = input.campaign ?? null;
  const account = input.account ?? null;
  const brandProfile = input.brandProfile ?? null;
  const imageUse = normalizeImageUse(input.imageUse, asset.asset_type);
  const metadata = jsonRecord(asset.metadata);

  const companyName =
    stringOrNull(brandProfile?.company_name) ??
    stringOrNull(account?.name) ??
    "the brand";

  const websiteUrl =
    stringOrNull(brandProfile?.website_url) ??
    stringOrNull(account?.website_url);

  const primaryCta =
    stringOrNull(brandProfile?.primary_cta) ??
    stringOrNull(account?.primary_cta) ??
    stringOrNull(campaign?.cta) ??
    "take the next step";

  const targetAudience =
    stringOrNull(brandProfile?.target_audience) ??
    stringOrNull(campaign?.audience) ??
    stringOrNull(campaign?.buyer_segment) ??
    "the ideal buyer";

  const tone =
    stringOrNull(brandProfile?.tone) ??
    stringOrNull(campaign?.tone) ??
    "professional, modern, useful, and credible";

  const coreOffers = stringOrNull(brandProfile?.core_offers);
  const serviceAreas = stringOrNull(brandProfile?.service_areas);
  const notes = stringOrNull(brandProfile?.notes);

  return [
    `Create a polished ${imageUseLabel(imageUse)} for ${companyName}.`,
    "",
    "This image will support an already-approved Marketing VIP content asset. It should feel specific to this business, audience, and message — not like generic stock art.",
    "",
    "Business context:",
    `- Company/brand: ${companyName}`,
    websiteUrl ? `- Website: ${websiteUrl}` : null,
    `- Target audience: ${targetAudience}`,
    coreOffers ? `- Core offers/services: ${coreOffers}` : null,
    serviceAreas ? `- Service areas/market: ${serviceAreas}` : null,
    `- Brand tone: ${tone}`,
    notes ? `- Brand notes: ${notes}` : null,
    "",
    "Campaign/content context:",
    `- Campaign: ${compactText(campaign?.name, "No campaign name available")}`,
    `- Campaign idea: ${compactText(campaign?.idea, "No campaign idea available")}`,
    `- Goal: ${compactText(campaign?.goal, "Support the content and drive action")}`,
    `- CTA: ${primaryCta}`,
    `- Source asset type: ${compactText(asset.asset_type, "content asset")}`,
    `- Source title: ${compactText(asset.title, "Untitled asset")}`,
    stringOrNull(metadata.visualAngle) ? `- Visual angle: ${metadata.visualAngle}` : null,
    "",
    "Source content to visually support:",
    truncate(asset.content, 1600),
    "",
    "Creative direction:",
    "- Make the image feel premium, useful, and business-relevant.",
    "- Show a clear situation, outcome, visual metaphor, or realistic business scene tied to the asset content.",
    "- Avoid vague technology glow, random charts, and generic people smiling at laptops unless the content specifically calls for that.",
    "- Do not include distorted text, fake logos, fake UI, watermarks, or unreadable typography.",
    "- Avoid putting readable text directly into the image. The post caption or email/blog copy will carry the message.",
    "- Leave clean negative space where the brand could later place copy if needed.",
    "- Keep it professional, modern, polished, and appropriate for a small-to-mid-sized business marketing campaign.",
    "- The image should be safe for public social media and business publishing.",
  ]
    .filter(Boolean)
    .join("\n");
}
