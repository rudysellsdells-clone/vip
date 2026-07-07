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
  const brand = clean(brandName, "Web Search Professionals");
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
    "- Length: approximately 20 seconds.",
    "- Style: modern, professional, clean, practical, and business-focused.",
    "- Visual tone: confident and helpful, not hype-driven or overly flashy.",
    "- Visuals: show a business owner or marketing leader reviewing website visibility, AI-assisted search discovery, local SEO signals, content consistency, lead opportunities, and a clean digital dashboard.",
    "- Motion: smooth transitions, subtle dashboard movement, simple scene changes, and clear pacing.",
    "- Branding: use a polished blue, white, and gray marketing-services look. Avoid fake metrics, fake testimonials, fake screenshots, or exaggerated performance claims.",
    "- On-screen text: use only short, readable phrases pulled from the script. Do not overload the video with paragraphs.",
    `- CTA frame: ${cta}`,
    "",
    "Output goal: create a credible business marketing video that supports the approved script and is ready for human review before publishing.",
  ].join("\n");
}
