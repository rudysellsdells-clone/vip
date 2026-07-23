import type { AdPackage, SearchAdVariant } from "./ad-package";

const SEARCH_AD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["variants"],
  properties: {
    variants: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "headlines",
          "descriptions",
          "keywordThemes",
          "negativeKeywordThemes",
          "pathOne",
          "pathTwo",
          "callouts",
          "sitelinks",
        ],
        properties: {
          name: { type: "string" },
          headlines: {
            type: "array",
            minItems: 10,
            maxItems: 15,
            items: { type: "string" },
          },
          descriptions: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "string" },
          },
          keywordThemes: {
            type: "array",
            minItems: 8,
            maxItems: 20,
            items: { type: "string" },
          },
          negativeKeywordThemes: {
            type: "array",
            minItems: 6,
            maxItems: 20,
            items: { type: "string" },
          },
          pathOne: { type: "string" },
          pathTwo: { type: "string" },
          callouts: {
            type: "array",
            minItems: 4,
            maxItems: 8,
            items: { type: "string" },
          },
          sitelinks: {
            type: "array",
            minItems: 4,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "text",
                "descriptionOne",
                "descriptionTwo",
                "destinationUrl",
              ],
              properties: {
                text: { type: "string" },
                descriptionOne: { type: "string" },
                descriptionTwo: { type: "string" },
                destinationUrl: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type GoogleSearchGenerationResult = {
  variants: SearchAdVariant[];
  model: string;
  generatedAt: string;
};

type RawSearchVariant = Omit<SearchAdVariant, "kind">;

type RawSearchResponse = {
  variants: RawSearchVariant[];
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function uniqueStrings(values: unknown, maxItems: number) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(stringValue).filter(Boolean))].slice(0, maxItems);
}

function truncate(value: unknown, maxLength: number) {
  const text = stringValue(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength + 1);
  const boundary = clipped.lastIndexOf(" ");
  return (boundary >= Math.floor(maxLength * 0.65)
    ? clipped.slice(0, boundary)
    : clipped.slice(0, maxLength)
  )
    .replace(/[\s,;:\-]+$/g, "")
    .trim();
}

function validDestination(value: unknown, fallback: string) {
  const candidate = stringValue(value) || fallback;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    url.hash = "";
    return url.toString();
  } catch {
    return fallback;
  }
}

function normalizeSearchVariant(
  value: RawSearchVariant,
  destinationUrl: string,
  index: number,
): SearchAdVariant {
  const headlines = uniqueStrings(value.headlines, 15).map((item) =>
    truncate(item, 30),
  );
  const descriptions = uniqueStrings(value.descriptions, 4).map((item) =>
    truncate(item, 90),
  );
  const keywordThemes = uniqueStrings(value.keywordThemes, 20).map((item) =>
    truncate(item, 80),
  );
  const negativeKeywordThemes = uniqueStrings(
    value.negativeKeywordThemes,
    20,
  ).map((item) => truncate(item, 80));
  const callouts = uniqueStrings(value.callouts, 8).map((item) =>
    truncate(item, 25),
  );
  const sitelinks = Array.isArray(value.sitelinks)
    ? value.sitelinks.slice(0, 6).map((item) => ({
        text: truncate(item?.text, 25),
        descriptionOne: truncate(item?.descriptionOne, 35),
        descriptionTwo: truncate(item?.descriptionTwo, 35),
        destinationUrl: validDestination(item?.destinationUrl, destinationUrl),
      }))
    : [];

  if (headlines.length < 8) {
    throw new Error(`Search variant ${index + 1} needs at least 8 unique headlines.`);
  }
  if (descriptions.length < 4) {
    throw new Error(`Search variant ${index + 1} needs 4 unique descriptions.`);
  }
  if (keywordThemes.length < 6) {
    throw new Error(`Search variant ${index + 1} needs at least 6 keyword themes.`);
  }
  if (negativeKeywordThemes.length < 4) {
    throw new Error(
      `Search variant ${index + 1} needs at least 4 negative-keyword themes.`,
    );
  }
  if (callouts.length < 4) {
    throw new Error(`Search variant ${index + 1} needs at least 4 callouts.`);
  }
  if (
    sitelinks.length < 4 ||
    sitelinks.some(
      (item) =>
        !item.text || !item.descriptionOne || !item.descriptionTwo,
    )
  ) {
    throw new Error(`Search variant ${index + 1} needs 4 complete sitelinks.`);
  }

  return {
    kind: "search",
    name: truncate(value.name, 80) || `Search Concept ${index + 1}`,
    headlines,
    descriptions,
    keywordThemes,
    negativeKeywordThemes,
    pathOne: truncate(value.pathOne, 15),
    pathTwo: truncate(value.pathTwo, 15),
    callouts,
    sitelinks,
  };
}

export function normalizeGoogleSearchVariants(
  value: unknown,
  destinationUrl: string,
): SearchAdVariant[] {
  const response =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as RawSearchResponse)
      : { variants: [] };
  if (!Array.isArray(response.variants) || response.variants.length < 2) {
    throw new Error("Google Search generation did not return enough variants.");
  }
  return response.variants
    .slice(0, 3)
    .map((item, index) => normalizeSearchVariant(item, destinationUrl, index));
}

function extractOutputText(responseJson: any) {
  if (typeof responseJson?.output_text === "string") return responseJson.output_text;
  if (!Array.isArray(responseJson?.output)) return "";
  return responseJson.output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .filter(
      (content: any) =>
        content?.type === "output_text" && typeof content?.text === "string",
    )
    .map((content: any) => content.text)
    .join("");
}

function compactStrategySnapshot(value: Record<string, unknown>) {
  const serialized = JSON.stringify(value ?? {});
  return serialized.length > 18000 ? serialized.slice(0, 18000) : serialized;
}

export async function generateGoogleSearchAdPackage(
  draft: AdPackage,
): Promise<GoogleSearchGenerationResult> {
  if (draft.channel !== "google_search" || draft.packageKind !== "search") {
    throw new Error("Google Search generation requires a Google Search package draft.");
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it in Vercel Environment Variables and redeploy.",
    );
  }

  const model =
    process.env.OPENAI_AD_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const systemPrompt = [
    "You are a senior paid-search strategist and conversion copywriter.",
    "Create truthful, specific, high-intent Google responsive search ad packages.",
    "Use only the approved campaign facts supplied. Never invent awards, pricing, guarantees, statistics, locations, credentials, urgency, or proof.",
    "Treat strategy and research as private planning context. Do not copy internal labels, instructions, JSON keys, or research language into public ads.",
    "Every headline must work alone and in combinations. Make variants meaningfully different: direct-response, problem-aware, and credibility-led.",
    "Return JSON only in the required schema.",
  ].join("\n");
  const userPrompt = [
    `Campaign: ${draft.campaignName}`,
    `Objective: ${draft.objective}`,
    `Audience: ${draft.audience}`,
    `Offer: ${draft.offer}`,
    `Final URL: ${draft.destinationUrl}`,
    `Approved strategy and evidence: ${compactStrategySnapshot(
      draft.strategy.strategySnapshot,
    )}`,
    "Create 3 distinct responsive-search-ad variants.",
    "Each variant should include 10-15 unique headlines, exactly 4 unique descriptions, practical keyword themes, negative-keyword themes that reduce obvious waste, two display paths, 4-8 callouts, and 4-6 sitelinks.",
    "Headlines must be 30 characters or fewer; descriptions 90 or fewer; paths 15 or fewer; callouts and sitelink text 25 or fewer; sitelink descriptions 35 or fewer.",
    "Use the final URL for sitelinks unless the approved context clearly provides another same-domain destination.",
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: 9000,
      text: {
        format: {
          type: "json_schema",
          name: "google_search_ad_package",
          strict: true,
          schema: SEARCH_AD_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenAI Search Ad request failed: ${response.status} ${response.statusText} — ${detail}`,
    );
  }

  const responseJson = await response.json();
  const outputText = extractOutputText(responseJson);
  if (!outputText) {
    throw new Error("Google Search generation returned no output text.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("Google Search generation returned invalid JSON.");
  }

  return {
    variants: normalizeGoogleSearchVariants(parsed, draft.destinationUrl),
    model,
    generatedAt: new Date().toISOString(),
  };
}
