export type LumaYoutubeScene = {
  sceneIndex: number;
  label: string;
  durationSeconds: number;
  prompt: string;
};

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function campaignValue(campaign: Record<string, unknown>, key: string, fallback = "") {
  return readString(campaign[key], fallback);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function approvedStrategy(campaign: Record<string, unknown>) {
  if (!isRecord(campaign.strategy)) return null;
  if (!isRecord(campaign.strategy.oneOffStrategyGate)) return null;
  if (campaign.strategy.oneOffStrategyGate.status !== "approved") return null;
  if (!isRecord(campaign.strategy.oneOffStrategyGate.strategy)) return null;

  return campaign.strategy.oneOffStrategyGate.strategy;
}

function getBusinessContext(campaign: Record<string, unknown>) {
  const strategy = approvedStrategy(campaign);
  const name = campaignValue(campaign, "name", "Campaign");
  const buyerSegment = campaignValue(campaign, "buyer_segment", "business owners");
  const audience = readString(
    strategy?.targetAudience,
    campaignValue(campaign, "audience", buyerSegment),
  );
  const buyerSituation = readString(
    strategy?.buyerSituation,
    `Show ${audience} encountering the campaign problem in a realistic business setting.`,
  );
  const coreProblem = readString(
    strategy?.coreProblem,
    campaignValue(campaign, "idea", "The current approach is not producing a dependable result."),
  );
  const businessConsequence = readString(
    strategy?.businessConsequence,
    campaignValue(campaign, "goal", "The problem creates delay, friction, or missed opportunity."),
  );
  const pointOfView = readString(
    strategy?.campaignPointOfView,
    "Show the better way to understand and address the problem.",
  );
  const offerExplanation = readString(
    strategy?.offerExplanation,
    "Show the approved offer as a practical response to the problem.",
  );
  const offerDeliverables = readString(
    strategy?.offerDeliverables,
    "Show what the buyer receives through believable actions and outcomes.",
  );
  const cta = readString(
    strategy?.primaryCta,
    campaignValue(campaign, "cta", "Take the next step"),
  );

  return {
    name,
    audience,
    buyerSituation,
    coreProblem,
    businessConsequence,
    pointOfView,
    offerExplanation,
    offerDeliverables,
    cta,
  };
}

function baseStylePrompt() {
  return [
    "Create a polished cinematic marketing video for YouTube.",
    "Style: realistic business storytelling, premium production, natural lighting, purposeful camera movement, and believable environments.",
    "No readable text overlays, no distorted words, no fake dashboards, no fabricated statistics, and no unsupported before-and-after claims.",
    "Use visual storytelling that reflects the approved campaign strategy rather than generic marketing imagery.",
    "Aspect ratio 16:9. Keep visual continuity with the previous scene when extending.",
  ].join(" ");
}

export function buildLumaYoutubeScenePlan(campaign: Record<string, unknown>) {
  const context = getBusinessContext(campaign);
  const style = baseStylePrompt();

  const scenes: LumaYoutubeScene[] = [
    {
      sceneIndex: 0,
      label: "Hook",
      durationSeconds: 5,
      prompt: [
        style,
        `Scene 1 of 4, hook. Campaign: ${context.name}.`,
        `Audience: ${context.audience}. Show this recognizable buyer situation: ${context.buyerSituation}`,
        `Make the business stakes immediately understandable without on-screen explanatory text.`,
      ].join(" "),
    },
    {
      sceneIndex: 1,
      label: "Problem",
      durationSeconds: 5,
      prompt: [
        style,
        "Scene 2 of 4, problem. Continue from the prior scene.",
        `Visualize the specific problem: ${context.coreProblem}`,
        `Show the practical consequence through realistic business activity: ${context.businessConsequence}`,
      ].join(" "),
    },
    {
      sceneIndex: 2,
      label: "Better Approach",
      durationSeconds: 5,
      prompt: [
        style,
        "Scene 3 of 4, better approach. Continue from the prior scene.",
        `Express this campaign point of view visually: ${context.pointOfView}`,
        `Show the approved offer mechanism through believable actions: ${context.offerExplanation}`,
        `Represent the deliverables without fake software or unsupported results: ${context.offerDeliverables}`,
      ].join(" "),
    },
    {
      sceneIndex: 3,
      label: "CTA",
      durationSeconds: 5,
      prompt: [
        style,
        "Scene 4 of 4, CTA and payoff. Continue from the prior scene.",
        "Show the buyer reaching a clearer decision or next step rather than an exaggerated success outcome.",
        `End with a clean visual action connected to this approved CTA: ${context.cta}.`,
      ].join(" "),
    },
  ];

  return scenes;
}

export function getLumaStatusForScene(sceneIndex: number) {
  return `generating_scene_${sceneIndex + 1}`;
}

export function summarizeScenePlan(scenes: LumaYoutubeScene[]) {
  return scenes
    .map((scene) => `${scene.sceneIndex + 1}. ${scene.label} — ${scene.durationSeconds}s`)
    .join("\n");
}
