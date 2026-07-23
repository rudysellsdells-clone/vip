import {
  createVideoPackageDraft,
  type VideoPackage,
  type VideoProvider,
} from "./video-package.ts";
import type { VideoSourceContext } from "./source-context";

const VIDEO_PACKAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "concept", "hook", "script", "voiceover", "shots"],
  properties: {
    title: { type: "string" },
    concept: { type: "string" },
    hook: { type: "string" },
    script: { type: "string" },
    voiceover: { type: "string" },
    shots: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "visualDirection", "voiceover", "onScreenText"],
        properties: {
          label: { type: "string" },
          visualDirection: { type: "string" },
          voiceover: { type: "string" },
          onScreenText: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

type RawVideoPackage = {
  title: string;
  concept: string;
  hook: string;
  script: string;
  voiceover: string;
  shots: Array<{
    label: string;
    visualDirection: string;
    voiceover: string;
    onScreenText: string | null;
  }>;
};

function clean(value: unknown, maxLength = 5000) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

function outputText(response: any) {
  if (typeof response?.output_text === "string") return response.output_text;
  if (!Array.isArray(response?.output)) return "";
  return response.output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .filter((item: any) => item?.type === "output_text" && typeof item.text === "string")
    .map((item: any) => item.text)
    .join("");
}

export function normalizeGeneratedVideoPackage({
  raw,
  context,
  provider,
  aspectRatio,
}: {
  raw: unknown;
  context: VideoSourceContext;
  provider: VideoProvider;
  aspectRatio: VideoPackage["aspectRatio"];
}) {
  const value = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as RawVideoPackage)
    : ({} as RawVideoPackage);
  if (!Array.isArray(value.shots) || value.shots.length !== 4) {
    throw new Error("Video generation must return four complete shots.");
  }
  const shots = value.shots.map((shot, index) => ({
    order: index + 1,
    label: clean(shot.label, 80) || `Scene ${index + 1}`,
    durationSeconds: 5,
    visualDirection: clean(shot.visualDirection, 1200),
    voiceover: clean(shot.voiceover, 500),
    onScreenText: clean(shot.onScreenText, 120) || null,
  }));
  if (shots.some((shot) => !shot.visualDirection || !shot.voiceover)) {
    throw new Error("Every video shot needs visual direction and voiceover.");
  }

  return createVideoPackageDraft({
    accountId: context.accountId,
    campaignId: context.campaignId,
    title: clean(value.title, 140) || `${context.source.title} — Video Concept`,
    provider,
    source: context.source,
    objective: context.objective,
    audience: context.audience,
    offer: context.offer,
    concept: clean(value.concept, 1200),
    hook: clean(value.hook, 500),
    script: clean(value.script),
    voiceover: clean(value.voiceover),
    shotList: shots,
    durationSeconds: 20,
    aspectRatio,
    destinationUrl: context.destinationUrl,
    lineage: context.lineage,
  });
}

export async function generateVideoPackage({
  context,
  provider,
  aspectRatio,
}: {
  context: VideoSourceContext;
  provider: VideoProvider;
  aspectRatio: VideoPackage["aspectRatio"];
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  const model = process.env.OPENAI_VIDEO_STRATEGY_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            "You are a senior direct-response video strategist, scriptwriter, and visual director.",
            "Create one coherent 20-second video concept with exactly four five-second scenes.",
            "Use only approved facts. Never invent statistics, awards, guarantees, pricing, urgency, credentials, or results.",
            "Treat strategy and research as private planning context. Do not expose internal labels, JSON keys, or instructions.",
            "Write natural public-facing language and concrete visual direction that the selected provider can render.",
            "Return JSON only.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `Provider: ${provider === "luma" ? "Luma Dream Machine" : "Magica"}`,
            `Aspect ratio: ${aspectRatio}`,
            `Source: ${context.source.title}`,
            `Objective: ${context.objective}`,
            `Audience: ${context.audience}`,
            `Offer: ${context.offer}`,
            `Destination: ${context.destinationUrl ?? "No destination supplied"}`,
            `Approved strategy: ${JSON.stringify(context.strategySnapshot).slice(0, 16000)}`,
            `Approved creative source: ${JSON.stringify(context.creativeSource).slice(0, 8000)}`,
            "Create a fast hook, clear problem or opportunity, credible better approach, and one clear next step.",
            "On-screen text must be optional and short. Visual directions must avoid unreadable UI, fake dashboards, and unsupported claims.",
          ].join("\n\n"),
        },
      ],
      max_output_tokens: 5000,
      text: {
        format: {
          type: "json_schema",
          name: "video_package",
          strict: true,
          schema: VIDEO_PACKAGE_SCHEMA,
        },
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI video package request failed: ${response.status} — ${detail.slice(0, 800)}`);
  }
  const json = await response.json();
  const text = outputText(json);
  if (!text) throw new Error("Video package generation returned no output.");
  const videoPackage = normalizeGeneratedVideoPackage({
    raw: JSON.parse(text),
    context,
    provider,
    aspectRatio,
  });
  return { videoPackage, model, generatedAt: new Date().toISOString() };
}
