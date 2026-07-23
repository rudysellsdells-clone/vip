import type {
  AdPackage,
  PaidSocialAdVariant,
} from "./ad-package";

const PAID_SOCIAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["variants"],
  properties: {
    variants: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "primaryText",
          "headline",
          "description",
          "callToAction",
          "audienceFrame",
          "creativeBrief",
        ],
        properties: {
          name: { type: "string" },
          primaryText: { type: "string" },
          headline: { type: "string" },
          description: { type: "string" },
          callToAction: { type: "string" },
          audienceFrame: { type: "string" },
          creativeBrief: { type: "string" },
        },
      },
    },
  },
} as const;

export type PaidSocialGenerationResult = {
  variants: PaidSocialAdVariant[];
  model: string;
  generatedAt: string;
};

type RawPaidSocialResponse = {
  variants: Array<Omit<PaidSocialAdVariant, "kind" | "platform">>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
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

function platformLimits(platform: "meta" | "linkedin") {
  return platform === "linkedin"
    ? { primaryText: 150, headline: 70, description: 100 }
    : { primaryText: 500, headline: 80, description: 100 };
}

export function normalizePaidSocialVariants({
  value,
  platform,
}: {
  value: unknown;
  platform: "meta" | "linkedin";
}): PaidSocialAdVariant[] {
  const response =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as RawPaidSocialResponse)
      : { variants: [] };
  if (!Array.isArray(response.variants) || response.variants.length < 4) {
    throw new Error("Paid Social generation did not return four complete variants.");
  }
  const limits = platformLimits(platform);
  const variants = response.variants.slice(0, 4).map((item, index) => ({
    kind: "paid_social" as const,
    platform,
    name: truncate(item.name, 80) || `Paid Social Concept ${index + 1}`,
    primaryText: truncate(item.primaryText, limits.primaryText),
    headline: truncate(item.headline, limits.headline),
    description: truncate(item.description, limits.description),
    callToAction: truncate(item.callToAction, 40),
    audienceFrame: truncate(item.audienceFrame, 300),
    creativeBrief: truncate(item.creativeBrief, 1000),
  }));

  variants.forEach((variant, index) => {
    const missing = [
      variant.primaryText,
      variant.headline,
      variant.description,
      variant.callToAction,
      variant.audienceFrame,
      variant.creativeBrief,
    ].some((item) => !item);
    if (missing) {
      throw new Error(`Paid Social variant ${index + 1} is incomplete.`);
    }
  });
  const uniquePrimaryText = new Set(
    variants.map((variant) => variant.primaryText.toLowerCase()),
  );
  if (uniquePrimaryText.size < 4) {
    throw new Error("Paid Social variants must contain distinct primary text.");
  }
  return variants;
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

export async function generatePaidSocialAdPackage(
  draft: AdPackage,
): Promise<PaidSocialGenerationResult> {
  if (
    draft.packageKind !== "paid_social" ||
    (draft.channel !== "meta" && draft.channel !== "linkedin")
  ) {
    throw new Error("Paid Social generation requires a Meta or LinkedIn package draft.");
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it in Vercel Environment Variables and redeploy.",
    );
  }

  const platform = draft.channel;
  const platformLabel = platform === "meta" ? "Meta" : "LinkedIn";
  const limits = platformLimits(platform);
  const model =
    process.env.OPENAI_AD_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const systemPrompt = [
    `You are a senior ${platformLabel} paid-social strategist and conversion copywriter.`,
    "Create truthful, audience-aware ads that feel native to the feed and lead to one clear action.",
    "Use only approved campaign facts. Never invent awards, pricing, guarantees, statistics, credentials, urgency, or proof.",
    "Treat strategy and research as private planning context. Never expose internal labels, prompt instructions, JSON keys, or research notes.",
    "Avoid generic hype. Make each concept specific to the buyer situation, problem, offer, and approved point of view.",
    "Return JSON only in the required schema.",
  ].join("\n");
  const userPrompt = [
    `Platform: ${platformLabel}`,
    `Campaign: ${draft.campaignName}`,
    `Objective: ${draft.objective}`,
    `Audience: ${draft.audience}`,
    `Offer: ${draft.offer}`,
    `Destination: ${draft.destinationUrl}`,
    `Approved strategy and evidence: ${compactStrategySnapshot(
      draft.strategy.strategySnapshot,
    )}`,
    "Create exactly four meaningfully different single-image ad concepts: direct-response, problem-aware, credibility-led, and educational.",
    `Keep primary text at or below ${limits.primaryText} characters, headlines at or below ${limits.headline}, and descriptions at or below ${limits.description}.`,
    "For each concept provide the public ad copy, a standard platform CTA label, the audience framing, and a practical image creative brief with subject, setting, composition, emotional tone, and what must not appear.",
    platform === "meta"
      ? "Write concise mobile-first copy with a strong first line and one visual focal point."
      : "Write professional feed copy that earns attention without sounding corporate or inflated.",
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
      max_output_tokens: 7000,
      text: {
        format: {
          type: "json_schema",
          name: "paid_social_ad_package",
          strict: true,
          schema: PAID_SOCIAL_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenAI Paid Social request failed: ${response.status} ${response.statusText} — ${detail}`,
    );
  }
  const responseJson = await response.json();
  const outputText = extractOutputText(responseJson);
  if (!outputText) throw new Error("Paid Social generation returned no output text.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("Paid Social generation returned invalid JSON.");
  }

  return {
    variants: normalizePaidSocialVariants({ value: parsed, platform }),
    model,
    generatedAt: new Date().toISOString(),
  };
}
