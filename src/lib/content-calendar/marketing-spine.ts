export type MarketingSpineStrategyInput = {
  monthlyObjective?: string;
  targetAudience?: string;
  primaryOffer?: string;
  keyTopics?: string;
  tone?: string;
  callToAction?: string;
  differentiator?: string;
  proofPoints?: string;
  originalityAngle?: string;
  objections?: string;
};

export type MarketingSpineChannelRole = {
  role: string;
  audienceMindset: string;
  messageAngle: string;
  ctaStyle: string;
  proofOrObjectionFocus: string;
};

export type MarketingSpine = {
  featureName: "Marketing Spine";
  version: "h1.6a2";
  gateStatus: "ready" | "weak_context" | "needs_context";
  readinessScore: number;
  missingRequired: string[];
  warnings: string[];
  campaignTheme: string;
  campaignObjective: string;
  audience: string;
  offer: string;
  buyerPain: string;
  positioningAngle: string;
  originalityAngle: string;
  primaryCta: string;
  proofPoints: string[];
  objections: string[];
  contentPillars: string[];
  brandTone: string;
  channelRoles: {
    linkedin: MarketingSpineChannelRole;
    facebook: MarketingSpineChannelRole;
    email: MarketingSpineChannelRole;
    blog: MarketingSpineChannelRole;
    video: MarketingSpineChannelRole;
    visual: MarketingSpineChannelRole;
    landingPage: MarketingSpineChannelRole;
  };
  avoid: string[];
  assetGuidance: {
    socialPosts: string;
    emails: string;
    blogs: string;
    videoPrompts: string;
    images: string;
    landingPages: string;
  };
  inheritancePath: string[];
};

export type MarketingSpineInput = {
  campaignTheme?: string;
  businessContext?: string;
  accountName?: string | null;
  strategy?: MarketingSpineStrategyInput;
};

export type AssetBriefInput = {
  assetType: string;
  assetLabel?: string;
  publicTitle?: string;
  weekNumber?: number;
  publicTopic?: string;
  marketingSpine?: MarketingSpine | null;
};

export type MarketingSpineAssetBrief = {
  assetType: string;
  channel: string;
  goal: string;
  audience: string;
  hook: string;
  keyMessage: string;
  proofPoint: string;
  objectionToAddress: string;
  cta: string;
  tone: string;
  specificityRequirement: string;
  genericRisk: string;
  inheritedFrom: string[];
};

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

export function splitStrategyList(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n|,|;|•/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function firstSentence(value: string) {
  const cleaned = clean(value);
  if (!cleaned) return "";

  const [first] = cleaned.split(/(?<=[.!?])\s+/);
  return clean(first).slice(0, 240);
}

function sentenceFromList(values: string[], fallback: string) {
  return values.length ? values[0] : fallback;
}

function inferBuyerPain({
  strategy,
  audience,
  offer,
}: {
  strategy: MarketingSpineStrategyInput;
  audience: string;
  offer: string;
}) {
  const proofText = clean(strategy.proofPoints);
  const painMatch = proofText.match(
    /(?:pain points?|common pains?|buyer pain|problem):\s*([^\n.]+)/i,
  );

  if (painMatch?.[1]) return clean(painMatch[1]);

  const topics = splitStrategyList(strategy.keyTopics);
  const problemTopic = topics.find((topic) =>
    /problem|pain|objection|challenge|visibility|lead|sales|trust|authority/i.test(
      topic,
    ),
  );

  if (problemTopic) {
    return `${audience || "The audience"} needs a clearer way to understand and act on ${problemTopic}.`;
  }

  if (offer) {
    return `${audience || "The audience"} may understand the problem, but they need a clearer reason to trust ${offer} as the next step.`;
  }

  return "The audience needs a clearer reason to care, trust the offer, and take the next step now.";
}

function inferPositioningAngle({
  strategy,
  audience,
  offer,
  buyerPain,
}: {
  strategy: MarketingSpineStrategyInput;
  audience: string;
  offer: string;
  buyerPain: string;
}) {
  if (clean(strategy.differentiator)) {
    return `${clean(strategy.differentiator)} gives ${audience || "the audience"} a more practical path from problem awareness to action.`;
  }

  if (offer) {
    return `${offer} is positioned as the practical next step for solving: ${buyerPain}`;
  }

  return "Lead with practical strategy, clear proof, and a simple next step instead of generic promotion.";
}

function inferOriginalityAngle({
  strategy,
  audience,
  offer,
  buyerPain,
}: {
  strategy: MarketingSpineStrategyInput;
  audience: string;
  offer: string;
  buyerPain: string;
}) {
  if (clean(strategy.originalityAngle)) return clean(strategy.originalityAngle);

  const differentiator = clean(strategy.differentiator);

  if (differentiator) {
    return `Most content explains the offer too late. This campaign uses ${differentiator} as the through-line so ${audience || "the buyer"} can connect the pain, proof, and next step faster.`;
  }

  if (offer) {
    return `The campaign should not simply promote ${offer}; it should show why the current way buyers handle this problem creates friction, delay, or missed opportunity.`;
  }

  return `The campaign's useful edge is to make the invisible cost of the problem obvious: ${buyerPain}`;
}

function defaultObjections(strategy: MarketingSpineStrategyInput) {
  const direct = splitStrategyList(strategy.objections);
  if (direct.length) return direct;

  const proofText = clean(strategy.proofPoints);
  const objectionMatch = proofText.match(
    /(?:common objections?|objections?):\s*([^\n]+)/i,
  );

  if (objectionMatch?.[1]) return splitStrategyList(objectionMatch[1]);

  return [
    "I am not sure this is urgent enough right now.",
    "I am not sure this will work for my business.",
    "I do not want another complicated marketing project.",
  ];
}

function contentPillars(
  strategy: MarketingSpineStrategyInput,
  buyerPain: string,
  positioningAngle: string,
) {
  const topics = splitStrategyList(strategy.keyTopics);

  return [
    ...topics,
    buyerPain,
    positioningAngle,
    clean(strategy.primaryOffer) || "the primary offer",
    clean(strategy.callToAction) || "the next step",
  ]
    .map((item) => clean(item))
    .filter(Boolean)
    .slice(0, 6);
}

function gateStatus({
  audience,
  offer,
  objective,
  cta,
  originalityAngle,
}: {
  audience: string;
  offer: string;
  objective: string;
  cta: string;
  originalityAngle: string;
}) {
  const missingRequired = [
    audience ? "" : "Audience",
    offer ? "" : "Offer",
    objective ? "" : "Campaign objective",
    cta ? "" : "Primary CTA",
    originalityAngle ? "" : "Originality angle",
  ].filter(Boolean);

  const presentCount = 5 - missingRequired.length;
  const readinessScore = Math.round((presentCount / 5) * 100);
  const status =
    readinessScore >= 80
      ? "ready"
      : readinessScore >= 50
        ? "weak_context"
        : "needs_context";

  return {
    missingRequired,
    readinessScore,
    gateStatus: status as MarketingSpine["gateStatus"],
  };
}

function buildChannelRoles({
  audience,
  offer,
  buyerPain,
  positioningAngle,
  originalityAngle,
  cta,
  proofPoints,
  objections,
}: {
  audience: string;
  offer: string;
  buyerPain: string;
  positioningAngle: string;
  originalityAngle: string;
  cta: string;
  proofPoints: string[];
  objections: string[];
}): MarketingSpine["channelRoles"] {
  const proof = sentenceFromList(proofPoints, positioningAngle);
  const objection = sentenceFromList(
    objections,
    "The buyer may not understand why this matters now.",
  );

  return {
    linkedin: {
      role: "Authority and strategic point of view",
      audienceMindset: `${audience || "The audience"} is evaluating credibility and practical expertise.`,
      messageAngle: originalityAngle,
      ctaStyle: `Soft professional CTA: ${cta || "invite a practical next step"}`,
      proofOrObjectionFocus: proof,
    },
    facebook: {
      role: "Familiarity, trust, and approachable local relevance",
      audienceMindset: `${audience || "The audience"} needs a quick, relatable reason to care.`,
      messageAngle: buyerPain,
      ctaStyle: `Simple action CTA: ${cta || "reach out"}`,
      proofOrObjectionFocus: objection,
    },
    email: {
      role: "Conversion and direct response",
      audienceMindset: `${audience || "The audience"} is closer to deciding and needs clarity.`,
      messageAngle: `${positioningAngle} Connect the pain directly to ${offer || "the offer"}.`,
      ctaStyle: `Direct CTA: ${cta || "take the next step"}`,
      proofOrObjectionFocus: objection,
    },
    blog: {
      role: "Search intent, education, and long-form authority",
      audienceMindset: `${audience || "The audience"} is researching the problem or solution.`,
      messageAngle: `Explain ${buyerPain} with practical steps, examples, and proof.`,
      ctaStyle: `Educational CTA: ${cta || "continue to the next step"}`,
      proofOrObjectionFocus: proof,
    },
    video: {
      role: "Pattern interrupt, urgency, and emotional clarity",
      audienceMindset: `${audience || "The audience"} needs to understand the idea fast.`,
      messageAngle: `Open with the cost of ignoring ${buyerPain}; close with ${offer || "the next step"}.`,
      ctaStyle: `Short verbal CTA: ${cta || "act now"}`,
      proofOrObjectionFocus: objection,
    },
    visual: {
      role: "Campaign memory and scroll-stopping visual support",
      audienceMindset: `${audience || "The audience"} notices visual relevance before reading copy.`,
      messageAngle: `Show the contrast between disconnected effort and a clear strategy spine.`,
      ctaStyle: "No heavy text in the visual unless explicitly required.",
      proofOrObjectionFocus: proof,
    },
    landingPage: {
      role: "Conversion destination and offer proof",
      audienceMindset: `${audience || "The audience"} is deciding whether to act.`,
      messageAngle: `${positioningAngle} Reinforce the offer, proof, objection handling, and CTA in one focused page.`,
      ctaStyle: `Primary page CTA: ${cta || "complete the conversion action"}`,
      proofOrObjectionFocus: objection,
    },
  };
}

export function buildMarketingSpine(
  input: MarketingSpineInput,
): MarketingSpine {
  const strategy = input.strategy ?? {};
  const campaignTheme = clean(input.campaignTheme) || "Authority Growth";
  const campaignObjective =
    clean(strategy.monthlyObjective) ||
    `Build a focused campaign around ${campaignTheme} that creates demand and moves the right audience toward the next step.`;
  const audience = clean(strategy.targetAudience) || "";
  const offer = clean(strategy.primaryOffer) || "";
  const primaryCta = clean(strategy.callToAction) || "";
  const buyerPain = inferBuyerPain({ strategy, audience, offer });
  const positioningAngle = inferPositioningAngle({
    strategy,
    audience,
    offer,
    buyerPain,
  });
  const originalityAngle = inferOriginalityAngle({
    strategy,
    audience,
    offer,
    buyerPain,
  });
  const proofPoints = splitStrategyList(strategy.proofPoints);
  const objections = defaultObjections(strategy);
  const pillars = contentPillars(strategy, buyerPain, positioningAngle);
  const gate = gateStatus({
    audience,
    offer,
    objective: campaignObjective,
    cta: primaryCta,
    originalityAngle,
  });

  const channelRoles = buildChannelRoles({
    audience,
    offer,
    buyerPain,
    positioningAngle,
    originalityAngle,
    cta: primaryCta,
    proofPoints,
    objections,
  });

  const warnings = [
    gate.gateStatus !== "ready"
      ? "The Marketing Spine can still run, but missing context may make assets less specific."
      : "",
    proofPoints.length
      ? ""
      : "No proof points were supplied; VIP will rely on positioning and business context.",
    clean(input.businessContext)
      ? ""
      : "No additional business context was supplied for this month.",
  ].filter(Boolean);

  return {
    featureName: "Marketing Spine",
    version: "h1.6a2",
    gateStatus: gate.gateStatus,
    readinessScore: gate.readinessScore,
    missingRequired: gate.missingRequired,
    warnings,
    campaignTheme,
    campaignObjective,
    audience,
    offer,
    buyerPain,
    positioningAngle,
    originalityAngle,
    primaryCta,
    proofPoints,
    objections,
    contentPillars: pillars,
    brandTone:
      clean(strategy.tone) || "practical, clear, credible, and specific",
    channelRoles,
    avoid: [
      "Do not create isolated assets that ignore the campaign strategy.",
      "Do not use generic marketing filler without a concrete buyer problem, proof point, or next step.",
      "Do not publish raw internal labels, strategy fields, or planning notes.",
      "Do not make unsupported claims, fake guarantees, fake case studies, or fake testimonials.",
    ],
    assetGuidance: {
      socialPosts:
        "Use the first line to introduce a specific pain, belief shift, proof point, or buyer decision trigger. Avoid generic promotion.",
      emails:
        "Connect the audience pain to the offer quickly, handle one objection, and make the CTA obvious.",
      blogs:
        "Answer a real buyer/search question with practical sections, examples, proof, and an internal CTA.",
      videoPrompts:
        "Hook in the first three seconds, show the cost of the problem visually, then close with one clear next step.",
      images:
        "Create a visual memory for the campaign angle. Keep text minimal and make the subject relevant to the buyer situation.",
      landingPages:
        "Use the spine as the page argument: problem, belief shift, offer, proof, objection handling, CTA.",
    },
    inheritancePath: [
      "Brand profile / account market profile",
      "Campaign strategy spine",
      "Channel role",
      "Content plan",
      "Asset brief",
      "Asset creation",
      "Quality review",
      "Publishing preflight",
    ],
  };
}

export function marketingSpineSummary(spine: MarketingSpine) {
  return {
    featureName: spine.featureName,
    version: spine.version,
    gateStatus: spine.gateStatus,
    readinessScore: spine.readinessScore,
    missingRequired: spine.missingRequired,
    campaignObjective: spine.campaignObjective,
    audience: spine.audience,
    offer: spine.offer,
    buyerPain: spine.buyerPain,
    positioningAngle: spine.positioningAngle,
    originalityAngle: spine.originalityAngle,
    primaryCta: spine.primaryCta,
    proofPoints: spine.proofPoints.slice(0, 5),
    objections: spine.objections.slice(0, 5),
    contentPillars: spine.contentPillars.slice(0, 6),
    brandTone: spine.brandTone,
    channelRoles: spine.channelRoles,
    avoid: spine.avoid,
  };
}

function channelFromAssetType(assetType: string) {
  if (assetType.includes("linkedin")) return "linkedin";
  if (assetType.includes("facebook")) return "facebook";
  if (assetType.includes("email")) return "email";
  if (assetType.includes("blog")) return "blog";
  if (assetType.includes("video") || assetType.includes("galaxyai_prompt"))
    return "video";
  if (assetType.includes("image") || assetType.includes("visual"))
    return "visual";
  return "general";
}

export function buildMarketingSpineAssetBrief(
  input: AssetBriefInput,
): MarketingSpineAssetBrief {
  const spine = input.marketingSpine;
  const assetType = clean(input.assetType) || "general";
  const channel = channelFromAssetType(assetType);
  const role =
    channel !== "general" && spine
      ? spine.channelRoles[channel as keyof MarketingSpine["channelRoles"]]
      : null;
  const topic =
    clean(input.publicTopic) ||
    sentenceFromList(spine?.contentPillars ?? [], "the campaign topic");
  const title = clean(input.publicTitle) || topic;
  const proofPoint = sentenceFromList(
    spine?.proofPoints ?? [],
    spine?.positioningAngle ??
      "Add a concrete proof point or practical example.",
  );
  const objection = sentenceFromList(
    spine?.objections ?? [],
    "The buyer may not understand why this matters now.",
  );

  return {
    assetType,
    channel,
    goal:
      role?.role ||
      "Support the campaign strategy with useful, specific content.",
    audience: spine?.audience || "the intended audience",
    hook:
      channel === "video"
        ? `Open with the cost of ignoring ${spine?.buyerPain || topic}.`
        : `Lead with a specific insight about ${topic}.`,
    keyMessage: role?.messageAngle || spine?.positioningAngle || title,
    proofPoint,
    objectionToAddress: objection,
    cta: spine?.primaryCta || "Invite the next step clearly.",
    tone: spine?.brandTone || "clear, credible, and practical",
    specificityRequirement:
      "Include at least one concrete buyer situation, business consequence, example, workflow step, proof point, or objection. The asset should not sound reusable for any random company.",
    genericRisk:
      "The asset becomes weak if it only describes the offer in broad terms without buyer pain, proof, objection handling, or a clear next step.",
    inheritedFrom: spine?.inheritancePath.slice(0, 5) ?? [
      "Campaign strategy",
      "Asset brief",
    ],
  };
}

export function formatMarketingSpineForPrompt(spine?: MarketingSpine | null) {
  if (!spine) return "";

  return [
    "MARKETING SPINE — REQUIRED STRATEGIC CONTEXT",
    `Gate Status: ${spine.gateStatus} (${spine.readinessScore}/100)`,
    `Campaign Objective: ${spine.campaignObjective}`,
    `Audience: ${spine.audience || "Not supplied"}`,
    `Offer: ${spine.offer || "Not supplied"}`,
    `Buyer Pain: ${spine.buyerPain}`,
    `Positioning Angle: ${spine.positioningAngle}`,
    `Originality Angle: ${spine.originalityAngle}`,
    `Primary CTA: ${spine.primaryCta || "Not supplied"}`,
    spine.proofPoints.length
      ? `Proof Points: ${spine.proofPoints.join(" | ")}`
      : "Proof Points: Not supplied",
    spine.objections.length
      ? `Objections: ${spine.objections.join(" | ")}`
      : "Objections: Not supplied",
    spine.contentPillars.length
      ? `Content Pillars: ${spine.contentPillars.join(" | ")}`
      : "Content Pillars: Not supplied",
    `Brand Tone: ${spine.brandTone}`,
    `Avoid: ${spine.avoid.join(" | ")}`,
  ].join("\n");
}
