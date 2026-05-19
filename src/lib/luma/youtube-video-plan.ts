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

function getBusinessContext(campaign: Record<string, unknown>) {
  const name = campaignValue(campaign, "name", "Campaign");
  const idea = campaignValue(campaign, "idea", "Help the business get found and convert more customers.");
  const buyerSegment = campaignValue(campaign, "buyer_segment", "business owners");
  const audience = campaignValue(campaign, "audience", buyerSegment);
  const goal = campaignValue(campaign, "goal", "increase visibility, trust, and qualified leads");
  const cta = campaignValue(campaign, "cta", "Schedule a strategy call");

  return {
    name,
    idea,
    buyerSegment,
    audience,
    goal,
    cta,
  };
}

function baseStylePrompt() {
  return [
    "Create a polished cinematic marketing video for YouTube.",
    "Style: modern digital marketing, premium agency, clean motion, professional lighting, smooth camera movement.",
    "No readable text overlays, no logos, no distorted words, no fake UI text.",
    "Use visual metaphor, business owners, search visibility, AI discovery, content systems, automation, and growth.",
    "Aspect ratio 16:9. Keep continuity with the previous scene when extending.",
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
        `Show the audience ${context.audience} facing the challenge behind this idea: ${context.idea}.`,
        "Visual mood: attention-grabbing, cinematic, high energy, clear business stakes.",
      ].join(" "),
    },
    {
      sceneIndex: 1,
      label: "Problem",
      durationSeconds: 5,
      prompt: [
        style,
        "Scene 2 of 4, problem. Continue from the prior scene.",
        `Show how the audience misses opportunities when visibility, AI search presence, content, and follow-up are not working together.`,
        `The implied business goal is to ${context.goal}.`,
      ].join(" "),
    },
    {
      sceneIndex: 2,
      label: "Solution",
      durationSeconds: 5,
      prompt: [
        style,
        "Scene 3 of 4, solution. Continue from the prior scene.",
        "Show an integrated digital marketing system coming together: SEO, AIO, content creation, automation, and social publishing working as one engine.",
        "Visual mood: confident, organized, transformative, premium agency execution.",
      ].join(" "),
    },
    {
      sceneIndex: 3,
      label: "CTA",
      durationSeconds: 5,
      prompt: [
        style,
        "Scene 4 of 4, CTA and payoff. Continue from the prior scene.",
        `Show the business moving from invisible to discoverable, trusted, and ready for more qualified leads.`,
        `End with a clear visual sense of action connected to this CTA: ${context.cta}.`,
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
