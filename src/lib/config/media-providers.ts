export function isLumaYoutubeLaneEnabled() {
  return process.env.ENABLE_LUMA_YOUTUBE_LANE === "true";
}

export function getDefaultMediaProvider() {
  return process.env.DEFAULT_MEDIA_PROVIDER?.trim() || "galaxyai";
}

export function getYoutubeVideoProvider() {
  return process.env.YOUTUBE_VIDEO_PROVIDER?.trim() || "galaxyai";
}

export function shouldUseGalaxyForYoutube() {
  return getYoutubeVideoProvider() === "galaxyai";
}
