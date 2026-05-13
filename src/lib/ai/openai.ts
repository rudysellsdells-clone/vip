import type { MarketingAssetPack } from "./types";

const MARKETING_ASSET_PACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["campaignStrategy", "assets", "approvalChecklist"],
  properties: {
    campaignStrategy: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "audienceAngle", "coreMessage", "positioning", "cta"],
      properties: {
        summary: { type: "string" },
        audienceAngle: { type: "string" },
        coreMessage: { type: "string" },
        positioning: { type: "string" },
        cta: { type: "string" },
      },
    },
    assets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "content", "notes"],
        properties: {
          type: {
            type: "string",
            enum: [
              "email",
              "linkedin_post",
              "facebook_post",
              "youtube_title",
              "youtube_description",
              "video_script",
              "galaxyai_prompt",
            ],
          },
          title: { type: "string" },
          content: { type: "string" },
          notes: { type: "string" },
        },
      },
    },
    approvalChecklist: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it in Vercel Environment Variables and redeploy.");
  }

  return apiKey;
}

function extractOutputText(responseJson: any) {
  if (typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  const output = responseJson.output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("");
}

function ensureRequiredAssetTypes(pack: MarketingAssetPack) {
  const requiredTypes = [
    "email",
    "linkedin_post",
    "facebook_post",
    "youtube_title",
    "youtube_description",
    "video_script",
    "galaxyai_prompt",
  ];

  const existingTypes = new Set(pack.assets.map((asset) => asset.type));
  const missing = requiredTypes.filter((type) => !existingTypes.has(type as any));

  if (missing.length) {
    throw new Error(`AI response was missing required assets: ${missing.join(", ")}`);
  }
}

export async function generateMarketingAssetPack(input: {
  systemPrompt: string;
  userPrompt: string;
}) {
  const apiKey = getOpenAiApiKey();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

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
          content: input.systemPrompt,
        },
        {
          role: "user",
          content: input.userPrompt,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "marketing_asset_pack",
          strict: true,
          schema: MARKETING_ASSET_PACK_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText} — ${errorText}`);
  }

  const responseJson = await response.json();
  const outputText = extractOutputText(responseJson);

  if (!outputText) {
    throw new Error("OpenAI response did not include output text.");
  }

  const parsed = JSON.parse(outputText) as MarketingAssetPack;

  if (!parsed.campaignStrategy || !Array.isArray(parsed.assets)) {
    throw new Error("OpenAI response did not match the Marketing Asset Pack shape.");
  }

  ensureRequiredAssetTypes(parsed);

  return parsed;
}
