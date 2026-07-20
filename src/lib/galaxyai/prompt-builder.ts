import { buildVideoPromptDoctrineSection } from "@/lib/ai/prompt-doctrine";

export type GalaxyAiPromptSource = {
  title?: string | null;
  videoScript: string;
  campaignAngle?: string | null;
  callToAction?: string | null;
  brandName?: string | null;
  audience?: string | null;
};

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function buildGalaxyAiPromptFromVideoScript({
  title,
  videoScript,
  campaignAngle,
  callToAction,
  brandName,
  audience,
}: GalaxyAiPromptSource) {
  const promptTitle = clean(title, "Short-form social video");
  const script = clean(videoScript, "Use the approved video script as the source narrative.");
  const cta = clean(callToAction, "Schedule a visibility review.");
  const brand = clean(brandName, "Marketing VIP");
  const viewer = clean(audience, "local business owners and service business leaders");
  const angle = clean(campaignAngle, "Help the viewer understand the practical business value behind the message.");

  return [
    `Create a polished short-form social video for ${brand}.`,
    "",
    `Video title/theme: ${promptTitle}`,
    `Target viewer: ${viewer}`,
    `Strategic angle: ${angle}`,
    "",
    "Use this approved video script as the creative source:",
    script,
    "",
    buildVideoPromptDoctrineSection(),
    "",
    "Production direction:",
    "- Format: short-form social video suitable for LinkedIn, Facebook, and YouTube Shorts.",
    "- Length: exactly 15 seconds.",
    "- Style: modern, professional, clean, practical, and business-focused.",
    "- Visual tone: confident and helpful, not hype-driven or overly flashy.",
    "- Visuals: create one clear, believable hero frame that expresses the script theme. Prefer one primary person or subject in a simple professional setting rather than a crowded collage or detailed dashboard.",
    "- Motion: animate the selected hero frame with restrained, realistic movement only. Use a slow camera push or gentle parallax, subtle natural subject movement, and a stable final hold. Avoid scene cuts and newly invented objects.",
    "- Branding: use a polished blue, white, and gray marketing-services look. Do not invent logos, metrics, testimonials, screenshots, awards, or performance claims.",
    "- On-screen text: avoid rendered text unless exact short wording is essential. Never create small dashboard text, fake numbers, or changing text during animation.",
    `- CTA frame: ${cta}`,
    "",
    "Output goal: create one artifact-controlled, realistic source frame and a stable 15-second animation that supports the approved script and is ready for human review before publishing.",
  ].join("\n");
}
