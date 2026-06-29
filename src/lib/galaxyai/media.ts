export type GalaxyMediaAttachment = {
  url: string;
  type: "image" | "video" | "file";
  source: "galaxyai";
  label?: string;
  runId?: string | null;
};

const MEDIA_KEY_HINTS = [
  "url",
  "uri",
  "image",
  "image_url",
  "imageUrl",
  "video",
  "video_url",
  "videoUrl",
  "media",
  "media_url",
  "mediaUrl",
  "asset",
  "asset_url",
  "assetUrl",
  "download",
  "download_url",
  "downloadUrl",
  "output",
  "output_url",
  "outputUrl",
  "file",
  "file_url",
  "fileUrl",
  "thumbnail",
  "thumbnail_url",
  "thumbnailUrl",
];

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".avif"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function stripUrlNoise(value: string) {
  return value
    .trim()
    .replace(/^["'([{<]+/, "")
    .replace(/["')\]}>.,;]+$/, "");
}

function inferMediaType(url: string): GalaxyMediaAttachment["type"] {
  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();

  if (IMAGE_EXTENSIONS.some((extension) => pathname.endsWith(extension))) {
    return "image";
  }

  if (VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension))) {
    return "video";
  }

  return "file";
}

function keyLooksLikeMedia(key: string) {
  const normalized = key.toLowerCase();

  return MEDIA_KEY_HINTS.some((hint) => normalized.includes(hint.toLowerCase()));
}

function collectUrlsFromString(value: string) {
  const matches = value.match(/https?:\/\/[^\s"'<>)}\]]+/g) ?? [];

  return matches.map(stripUrlNoise).filter(isHttpUrl);
}

function extractUrlsRecursive(
  value: unknown,
  options: {
    parentKey?: string;
    label?: string;
    seen: Set<string>;
    output: GalaxyMediaAttachment[];
  }
) {
  if (typeof value === "string") {
    const directValue = stripUrlNoise(value);

    if (isHttpUrl(directValue) && (!options.parentKey || keyLooksLikeMedia(options.parentKey))) {
      if (!options.seen.has(directValue)) {
        options.seen.add(directValue);
        options.output.push({
          url: directValue,
          type: inferMediaType(directValue),
          source: "galaxyai",
          label: options.label,
        });
      }
    }

    for (const url of collectUrlsFromString(value)) {
      if (!options.seen.has(url)) {
        options.seen.add(url);
        options.output.push({
          url,
          type: inferMediaType(url),
          source: "galaxyai",
          label: options.label,
        });
      }
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractUrlsRecursive(item, options);
    }

    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    extractUrlsRecursive(nestedValue, {
      ...options,
      parentKey: key,
      label: options.label ?? key,
    });
  }
}

function prioritizeMedia(media: GalaxyMediaAttachment[]) {
  return [...media].sort((a, b) => {
    const priority = { image: 0, video: 1, file: 2 };

    return priority[a.type] - priority[b.type];
  });
}

export function extractGalaxyMediaAttachments(value: unknown) {
  const seen = new Set<string>();
  const output: GalaxyMediaAttachment[] = [];

  extractUrlsRecursive(value, {
    seen,
    output,
  });

  return prioritizeMedia(output);
}

export async function loadGalaxyMediaForAsset({
  supabase,
  userId,
  accountId = null,
  assetId,
  campaignId,
  limit = 8,
}: {
  supabase: any;
  userId: string;
  accountId?: string | null;
  assetId: string;
  campaignId?: string | null;
  limit?: number;
}) {
  const runs: Array<Record<string, any>> = [];

  let assetRunsQuery = supabase
    .from("galaxyai_runs")
    .select("id,output,status,completed_at,created_at,asset_id,campaign_id")
    .eq("asset_id", assetId);

  assetRunsQuery = accountId ? assetRunsQuery.eq("account_id", accountId) : assetRunsQuery.eq("user_id", userId);

  const { data: assetRuns } = await assetRunsQuery
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (Array.isArray(assetRuns)) {
    runs.push(...assetRuns);
  }

  if (campaignId) {
    let campaignRunsQuery = supabase
      .from("galaxyai_runs")
      .select("id,output,status,completed_at,created_at,asset_id,campaign_id")
      .eq("campaign_id", campaignId);

    campaignRunsQuery = accountId ? campaignRunsQuery.eq("account_id", accountId) : campaignRunsQuery.eq("user_id", userId);

    const { data: campaignRuns } = await campaignRunsQuery
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (Array.isArray(campaignRuns)) {
      const existingIds = new Set(runs.map((run) => run.id));
      runs.push(...campaignRuns.filter((run) => !existingIds.has(run.id)));
    }
  }

  const media: GalaxyMediaAttachment[] = [];

  for (const run of runs) {
    const extracted = extractGalaxyMediaAttachments(run.output);

    media.push(
      ...extracted.map((attachment) => ({
        ...attachment,
        runId: run.id,
      }))
    );
  }

  const deduped = new Map<string, GalaxyMediaAttachment>();

  for (const attachment of media) {
    if (!deduped.has(attachment.url)) {
      deduped.set(attachment.url, attachment);
    }
  }

  return prioritizeMedia([...deduped.values()]).slice(0, limit);
}

export function getPrimaryGalaxyMedia(media: GalaxyMediaAttachment[]) {
  return media[0] ?? null;
}

export function getPrimaryImage(media: GalaxyMediaAttachment[]) {
  return media.find((attachment) => attachment.type === "image") ?? null;
}

export function getPrimaryVideo(media: GalaxyMediaAttachment[]) {
  return media.find((attachment) => attachment.type === "video") ?? null;
}

export function buildNativeUploadInstruction({
  platform,
  action,
  media,
  captionField,
  mediaField,
}: {
  platform: "Facebook" | "LinkedIn";
  action: string;
  media: GalaxyMediaAttachment | null;
  captionField: string;
  mediaField: string;
}) {
  if (!media) {
    return "";
  }

  return [
    "Native media upload requirement:",
    `Use Zapier action: ${action}`,
    `Use the approved post text as the ${captionField} field.`,
    `Use this GalaxyAI URL as the ${mediaField} upload field: ${media.url}`,
    `The media type is ${media.type}.`,
    "Do not paste the media URL into the post body.",
    "Do not publish the URL as a link preview unless the upload field fails and the action explicitly requires a URL field.",
    `${platform} should treat the URL as a file/media source to upload from, not as text content.`,
  ].join("\n");
}
