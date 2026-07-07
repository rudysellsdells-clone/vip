export type PromptDoctrineChannel =
  | "all"
  | "blog"
  | "email"
  | "linkedin"
  | "facebook"
  | "video"
  | "visual"
  | "landing_page";

function lines(items: Array<string | null | undefined>) {
  return items.filter(Boolean).join("\n");
}

export function buildPromptSourceHierarchySection() {
  return lines([
    "## Source Hierarchy",
    "Use context in this order:",
    "1. Approved brand/account/clone memory, account strategy, knowledge sources, campaign strategy, Marketing Spine, and asset brief.",
    "2. Existing campaign fields, offer details, buyer segment/audience details, CTA, and channel plan.",
    "3. Safe business reasoning that does not invent specific claims.",
    "4. Clearly hypothetical examples only when they are phrased as examples, not facts.",
    "",
    "Never override supplied brand/account facts with generic assumptions.",
  ]);
}

export function buildStrategyInheritanceSection() {
  return lines([
    "## Strategy Inheritance Rules",
    "- Every asset must inherit the campaign audience, offer, goal, CTA, and originality angle when provided.",
    "- Use the Marketing Spine or one-off campaign strategy as the chain of custody between strategy and execution.",
    "- The asset should clearly do the job assigned to its channel, not repeat the exact same message in every format.",
    "- Translate strategy into useful public content. Do not print raw labels like Marketing Spine, asset brief, campaign metadata, internal week, or prompt notes in public-facing copy.",
    "- If strategy inputs are thin, create a useful first draft using available context, but do not invent proof.",
  ]);
}

export function buildContextToCopyFirewallSection() {
  return lines([
    "## Context-to-Copy Firewall",
    "- Treat brand profile, market profile, account strategy, campaign brief, Marketing Spine, service line, buyer segment, offer, proof, and calendar fields as private source context.",
    "- Do not paste those fields verbatim into the finished asset unless the wording is a proper noun, approved tagline, exact offer name, exact CTA, legal wording, or a user-supplied quote explicitly meant for publication.",
    "- Convert context into original sentences, buyer examples, useful explanations, practical steps, objection handling, and channel-appropriate copy.",
    "- Do not include raw field labels such as Target Audience, Offer Focus, Brand Tone, Proof Points, Content Angle, Marketing Spine, Asset Brief, or Additional Business Context.",
    "- If a source field is written as a list, use it to choose the angle and details. Do not print the list as the body of the asset.",
    "- Never publish planning language such as: preferred business outcome, selected audience, selected offer, proof point, supporting context, or practical context point.",
    "- The finished asset should read like public marketing content, not like a completed form, intake worksheet, strategy note, or prompt summary.",
  ]);
}

export function buildEvidenceIntegritySection() {
  return lines([
    "## Evidence Integrity Rules",
    "- Use supplied proof points, knowledge, examples, service details, market context, and brand facts before using general reasoning.",
    "- Do not invent metrics, testimonials, awards, client names, rankings, revenue, traffic, ROI, case studies, certifications, locations, guarantees, or completed actions.",
    "- When proof is limited, use practical explanation, buyer logic, process detail, examples framed as possibilities, or common objections instead of fake authority.",
    "- Claims must either be supported by context or written as careful, general guidance.",
  ]);
}

export function buildOriginalityRequirementSection() {
  return lines([
    "## Originality Requirement",
    "Every asset needs at least one originality driver:",
    "- a contrarian or non-obvious point of view",
    "- a practical insight competitors usually skip",
    "- a buyer pain or decision trigger that feels specific",
    "- a unique mechanism, process, or framework",
    "- a before/after belief shift",
    "- a local, industry, or service-specific angle",
    "- a useful example, scenario, or operational detail",
    "",
    "Do not settle for generic advice. The asset should make the reader feel the business understands their situation.",
  ]);
}

export function buildAntiGenericRulesSection() {
  return lines([
    "## Anti-Generic Rules",
    "- Do not use vague filler as the main idea.",
    "- Avoid phrases like: in today's digital world, take your business to the next level, boost your online presence, unlock your potential, grow your business, drive results, maximize your reach, elevate your brand.",
    "- If a common phrase is unavoidable, immediately make it specific with a buyer problem, example, consequence, proof point, or next step.",
    "- If the finished asset could be copied into a random competitor's campaign with minimal edits, rewrite it before returning.",
  ]);
}

export function buildChannelStandardsSection(channels: PromptDoctrineChannel[] = ["all"]) {
  const includeAll = channels.includes("all");

  const sections: string[] = ["## Channel Standards"];

  if (includeAll || channels.includes("linkedin")) {
    sections.push(lines([
      "### LinkedIn",
      "- Start with a strong first-line hook, insight, or business observation.",
      "- Use short paragraphs and a clear point of view.",
      "- Include practical value, not just promotion.",
      "- Use a CTA or conversation prompt that fits the post.",
      "- Use 3 to 5 clean, relevant hashtags at the end. Do not turn full sentences or broken phrases into hashtags.",
      "- Do not publish raw planning fragments such as preferred business outcome, proof point, or supporting context.",
    ]));
  }

  if (includeAll || channels.includes("facebook")) {
    sections.push(lines([
      "### Facebook",
      "- Sound approachable, useful, and human.",
      "- Use concrete service/business context and simple phrasing.",
      "- Emoji are fine when natural; avoid clutter.",
      "- Use a soft CTA or engagement prompt.",
      "- Use no more than 4 clean, relevant hashtags at the end. Do not turn full sentences or broken phrases into hashtags.",
      "- Do not publish raw planning fragments such as preferred business outcome, proof point, or supporting context.",
    ]));
  }

  if (includeAll || channels.includes("email")) {
    sections.push(lines([
      "### Email",
      "- Include subject line, preview line, body, and one clear CTA.",
      "- Name the reason the reader should care now.",
      "- Keep the message useful and direct.",
      "- Avoid sounding spammy, needy, or over-automated.",
    ]));
  }

  if (includeAll || channels.includes("blog")) {
    sections.push(lines([
      "### Blog",
      "- Match a clear search/user intent.",
      "- Use helpful H2/H3 structure, examples, and practical takeaways.",
      "- Include topical clarity and entity-rich language without keyword stuffing.",
      "- Include a CTA that connects naturally to the offer.",
    ]));
  }

  if (includeAll || channels.includes("video")) {
    sections.push(lines([
      "### Video",
      "- Hook the viewer in the first three seconds.",
      "- Use clear beats or scenes.",
      "- Make the visual direction specific enough to produce a useful video.",
      "- Keep the CTA simple and visible.",
    ]));
  }

  if (includeAll || channels.includes("visual")) {
    sections.push(lines([
      "### Visual / Image",
      "- Use one strong visual idea tied to the campaign angle.",
      "- Avoid generic stock scenes unless they are made specific by context.",
      "- Avoid fake UI, fake numbers, distorted text, clutter, watermarks, warped logos, and exaggerated claims.",
      "- Keep readable text minimal or absent unless explicitly requested.",
    ]));
  }

  if (includeAll || channels.includes("landing_page")) {
    sections.push(lines([
      "### Landing Page",
      "- Open with a clear problem, offer, outcome, and CTA.",
      "- Include proof, objections/FAQ, benefits, and a final CTA.",
      "- Make the page conversion-focused without becoming hype-driven.",
    ]));
  }

  return sections.join("\n\n");
}

export function buildFinalAssetSelfCheckSection() {
  return lines([
    "## Final Self-Check Before Returning",
    "Quietly review the asset before returning it:",
    "- Does it match the audience, offer, CTA, and channel?",
    "- Does it include a clear originality angle or specific insight?",
    "- Does it include concrete detail, example, proof, objection, or decision trigger?",
    "- Does it avoid unsupported claims?",
    "- Does it avoid raw internal labels and prompt notes?",
    "- Would a serious human reviewer understand why this asset exists?",
    "- If it still sounds generic, improve it before returning.",
  ]);
}

export function buildGenerationPromptDoctrineSection(channels: PromptDoctrineChannel[] = ["all"]) {
  return [
    buildPromptSourceHierarchySection(),
    buildStrategyInheritanceSection(),
    buildContextToCopyFirewallSection(),
    buildEvidenceIntegritySection(),
    buildOriginalityRequirementSection(),
    buildAntiGenericRulesSection(),
    buildChannelStandardsSection(channels),
    buildFinalAssetSelfCheckSection(),
  ].join("\n\n");
}

export function buildRepairPromptDoctrineSection() {
  return [
    buildContextToCopyFirewallSection(),
    buildEvidenceIntegritySection(),
    buildOriginalityRequirementSection(),
    buildAntiGenericRulesSection(),
    buildFinalAssetSelfCheckSection(),
  ].join("\n\n");
}

export function buildVisualPromptDoctrineSection() {
  return [
    buildEvidenceIntegritySection(),
    buildOriginalityRequirementSection(),
    buildChannelStandardsSection(["visual"]),
    lines([
      "## Visual Prompt Quality Rules",
      "- Describe subject, setting, composition, lighting, camera/framing, mood, and what the image must avoid.",
      "- Make the visual concept support the asset, not merely decorate it.",
      "- Prefer a realistic scene, useful metaphor, or business-relevant outcome over generic AI/technology glow.",
      "- Avoid relying on readable text inside the image.",
    ]),
  ].join("\n\n");
}

export function buildVideoPromptDoctrineSection() {
  return [
    buildEvidenceIntegritySection(),
    buildOriginalityRequirementSection(),
    buildChannelStandardsSection(["video"]),
    lines([
      "## Video Prompt Quality Rules",
      "- Give a first-three-seconds hook.",
      "- Define visual beats, scene transitions, subject behavior, pacing, and CTA frame.",
      "- Avoid fake dashboards, fake metrics, fake testimonials, and exaggerated outcomes.",
      "- Make the video useful for human review before publishing.",
    ]),
  ].join("\n\n");
}
