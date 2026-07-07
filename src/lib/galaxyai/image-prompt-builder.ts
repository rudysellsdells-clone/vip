import type { MonthlyCampaignStrategyInput } from "@/lib/content-calendar/monthly-campaign-planner";
import { buildVisualPromptDoctrineSection } from "@/lib/ai/prompt-doctrine";

export type SocialImagePlatform = "linkedin" | "facebook";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function joinSections(sections: Array<string | null | undefined>) {
  return sections.map((section) => clean(section)).filter(Boolean).join("\n\n");
}

function platformDirection(platform: SocialImagePlatform) {
  if (platform === "linkedin") {
    return {
      label: "LinkedIn feed image",
      dimensions: "Square 1200x1200 preferred, with enough safe margin to crop to 1200x627 if needed.",
      tone: "Professional, credible, polished, and business-focused.",
      layout:
        "Clean composition with one clear focal point, subtle business context, and room for a short headline overlay without crowding the image.",
    };
  }

  return {
    label: "Facebook feed image",
    dimensions: "Square 1200x1200 preferred for flexible Facebook feed placement.",
    tone: "Friendly, approachable, clear, and locally relevant while still looking professional.",
    layout:
      "Simple composition with an immediate visual idea, warm service-business context, and room for a short headline overlay if needed.",
  };
}

export function buildCampaignVisualDirection({
  publicTitle,
  campaignAngle,
  businessContext,
  strategy,
}: {
  publicTitle: string;
  campaignAngle: string;
  businessContext?: string;
  strategy: MonthlyCampaignStrategyInput;
}) {
  const audience = clean(strategy.targetAudience) || "the intended buyer";
  const offer = clean(strategy.primaryOffer) || "the featured service or next step";
  const cta = clean(strategy.callToAction) || "contact the business for the recommended next step";
  const differentiator = clean(strategy.differentiator) || "clear, practical service guidance";

  return joinSections([
    `# Campaign Visual Direction: ${publicTitle}`,
    `Campaign angle: ${campaignAngle}`,
    businessContext ? `Account / business context:\n${businessContext}` : "",
    `Target audience: ${audience}`,
    `Featured offer or service: ${offer}`,
    `Primary CTA: ${cta}`,
    `Differentiator to express visually: ${differentiator}`,
    buildVisualPromptDoctrineSection(),
    [
      "Shared visual system:",
      "- Create a consistent weekly campaign look that can be adapted for LinkedIn and Facebook.",
      "- Use realistic service-business scenes, clean professional composition, and a clear sense of customer benefit.",
      "- Keep the style polished, modern, trustworthy, and practical.",
      "- Use subtle brand-friendly colors rather than loud stock-art styling.",
      "- Avoid fake charts, fake analytics numbers, unreadable dashboards, cluttered text, exaggerated claims, warped logos, and distorted people.",
      "- Use abstract UI panels or simple service visuals when showing screens; do not render detailed small text.",
    ].join("\n"),
    [
      "Prompt consistency rules:",
      "- Each social post should feel like part of the same campaign family.",
      "- Platform-specific prompts may adjust crop, mood, and composition, but should not create unrelated concepts.",
      "- Prefer one strong idea per image over a busy collage.",
    ].join("\n"),
  ]);
}

export function buildGalaxyAiSocialImagePrompt({
  platform,
  publicTitle,
  campaignAngle,
  campaignVisualDirection,
  postCopy,
  strategy,
}: {
  platform: SocialImagePlatform;
  publicTitle: string;
  campaignAngle: string;
  campaignVisualDirection: string;
  postCopy: string;
  strategy: MonthlyCampaignStrategyInput;
}) {
  const platformSpec = platformDirection(platform);
  const audience = clean(strategy.targetAudience) || "the intended buyer";
  const offer = clean(strategy.primaryOffer) || "the featured service or next step";
  const cta = clean(strategy.callToAction) || "contact the business";

  return joinSections([
    `Create a ${platformSpec.label} for the campaign: ${publicTitle}`,
    `Platform format: ${platformSpec.dimensions}`,
    `Platform tone: ${platformSpec.tone}`,
    `Layout direction: ${platformSpec.layout}`,
    `Campaign angle: ${campaignAngle}`,
    `Target audience: ${audience}`,
    `Featured service / offer: ${offer}`,
    `CTA idea: ${cta}`,
    `Use this weekly visual direction as the shared style system:\n${campaignVisualDirection}`,
    `Post copy this image supports:\n${postCopy}`,
    buildVisualPromptDoctrineSection(),
    [
      "Creative direction:",
      "- Create a clean, professional social image that supports the post without trying to include the entire post as text.",
      "- Use realistic service-business or customer-benefit visuals tied to the campaign theme.",
      "- Keep any text overlay extremely short, if used at all.",
      "- Leave safe space for optional headline text.",
      "- Make the final image feel credible, polished, and ready for a business social feed.",
    ].join("\n"),
    [
      "Artifact control and quality requirements:",
      "- Before finalizing, review the output at least three times for artifacts that do not fit the prompt.",
      "- Check for distorted hands, malformed faces, warped logos, fake UI numbers, impossible reflections, misspelled words, unreadable text, strange objects, clutter, or mismatched service context.",
      "- If artifacts are present, regenerate or refine until the image is clean, realistic, professional, and consistent with the prompt.",
      "- Avoid detailed small text inside dashboards, screens, signs, documents, or charts.",
      "- Do not include fake metrics, fake analytics results, fake awards, or exaggerated claims.",
    ].join("\n"),
    [
      "Output requirement:",
      "- Produce one high-quality image asset suitable for social publishing.",
      "- The image should be reviewed for prompt fit and visual quality before it is accepted as final.",
    ].join("\n"),
  ]);
}
