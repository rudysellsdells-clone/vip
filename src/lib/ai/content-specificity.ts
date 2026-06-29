export const GENERIC_PHRASE_WARNINGS = [
  "in today's digital world",
  "take your business to the next level",
  "boost your online presence",
  "engage your audience",
  "unlock your potential",
  "grow your business",
  "drive results",
  "stand out from the competition",
  "maximize your reach",
  "elevate your brand",
];

export const SPECIFICITY_CONTRACT = [
  "Every first draft must be specific enough that it could not be copied onto a random competitor's website without obvious edits.",
  "Use the account, campaign, market profile, buyer segment, offer, service line, brand voice, and clone memory whenever they are available.",
  "Lead with a concrete buyer problem, practical consequence, or timely opportunity instead of vague marketing language.",
  "Include real-world detail: examples, scenarios, objections, decision triggers, workflow steps, local/service context, or operational implications.",
  "Explain claims instead of simply making them. Avoid unsupported proof, fake statistics, fake rankings, fake client results, and fake testimonials.",
  "Make the CTA specific and connected to the asset purpose.",
  "Remove generic filler phrases unless they are immediately followed by concrete details.",
];

export const ASSET_TYPE_DETAIL_STANDARDS: Record<string, string[]> = {
  blog_post: [
    "Open with a specific problem, buyer situation, or decision moment.",
    "Include useful H2/H3 sections, practical examples, and a short FAQ when appropriate.",
    "Give the reader concrete next steps, not generic advice.",
    "Include SEO/AIO-friendly topical clarity, entity-rich language, and a clear CTA.",
  ],
  email: [
    "Include a subject line, preview line, concise body, and one clear CTA.",
    "Name a specific pain, missed opportunity, or business trigger.",
    "Sound consultative and useful, not spammy or needy.",
    "Avoid pretending an audit, research, or result happened unless provided in the context.",
  ],
  linkedin_post: [
    "Start with a strong first-line hook or point of view.",
    "Use short paragraphs with a specific business lesson or example.",
    "Include a clear takeaway and natural CTA or engagement prompt.",
    "Use relevant hashtags only when they add context.",
  ],
  facebook_post: [
    "Use an approachable hook tied to a real business situation.",
    "Keep it readable with short paragraphs and concrete detail.",
    "Include a soft CTA and avoid overusing hashtags.",
  ],
  video_script: [
    "Include a clear first-three-seconds hook.",
    "Use a scene-by-scene or beat-by-beat structure.",
    "Include audience, visual mood, voiceover direction, and CTA.",
    "Avoid generic visuals like business people smiling at laptops unless the scene has a specific reason.",
  ],
  galaxyai_prompt: [
    "Describe the scene, camera movement, lighting, environment, subject behavior, and brand tone.",
    "Specify what should and should not appear on screen.",
    "Make the visual concept match the campaign angle and video script.",
  ],
};

export function buildSpecificityContractSection() {
  return [
    "## Specificity Contract",
    ...SPECIFICITY_CONTRACT.map((rule) => `- ${rule}`),
    "",
    "## Generic Language Watchlist",
    "Avoid these phrases unless they are immediately made specific with a concrete buyer problem, example, or operational detail:",
    ...GENERIC_PHRASE_WARNINGS.map((phrase) => `- ${phrase}`),
  ].join("\n");
}

export function detailStandardsForAssetType(assetType: string) {
  const standards = ASSET_TYPE_DETAIL_STANDARDS[assetType] ?? [
    "Use a specific audience, problem, offer, example, and CTA.",
    "Make the asset useful enough for a human reviewer to understand why it exists.",
  ];

  return standards;
}

export function buildAssetTypeDetailStandardsSection(assetTypes?: string[]) {
  const types = assetTypes?.length
    ? assetTypes
    : ["blog_post", "email", "linkedin_post", "facebook_post", "video_script", "galaxyai_prompt"];

  return [
    "## Asset-Type Detail Standards",
    ...types.flatMap((type) => [
      `### ${type}`,
      ...detailStandardsForAssetType(type).map((rule) => `- ${rule}`),
    ]),
  ].join("\n");
}

export function buildGenericContentPenaltyRules() {
  return [
    "Generic-content penalty rules:",
    "- Penalize content that could apply to any company in any industry.",
    "- Penalize vague claims that are not explained with detail, examples, scenarios, or next steps.",
    "- Penalize empty phrases from the generic language watchlist.",
    "- Reward content that uses the buyer segment, offer, channel, CTA, and business context in a useful way.",
    "- Reward concrete examples, objections, implementation steps, decision triggers, and audience-specific language.",
  ].join("\n");
}
