import { buildAssetTypeDetailStandardsSection, buildSpecificityContractSection } from "@/lib/ai/content-specificity";
import { isSocialAssetType, preparePublicAssetContent } from "@/lib/content/public-content-cleaner";

export type QualityResubmissionInput = {
  assetTitle: string;
  assetType: string;
  assetContent: string;
  reviewSummary?: string | null;
  strengths?: unknown;
  improvements?: unknown;
  suggestedRevision?: string | null;
  scores?: {
    overall?: number | null;
    brandVoice?: number | null;
    clarity?: number | null;
    cta?: number | null;
    seoAio?: number | null;
    conversion?: number | null;
  };
};

function read(value: unknown, fallback = "") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function toList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function systemPrompt(assetType: string) {
  const socialInstructions = isSocialAssetType(assetType)
    ? [
        "For LinkedIn and Facebook assets, include a few relevant emojis naturally in the post.",
        "For LinkedIn and Facebook assets, include relevant hashtags at the end.",
        "Use hashtags related to the topic, visibility, local SEO, business growth, Web Search Pros, and the post angle.",
      ]
    : [];

  return [
    "You are Rudy's VIP content improvement engine for Web Search Pros.",
    "Your job is to create an improved version of a generated marketing asset based on a quality review.",
    "Keep the same strategic intent, asset type, and general purpose.",
    "Improve weak sections based on the quality review notes.",
    "Keep the writing human, clear, useful, practical, and aligned with Web Search Pros.",
    "Make the revised asset more specific, detailed, and useful before it returns to review.",
    "Do not fabricate case studies, client results, testimonials, rankings, traffic, revenue, or guaranteed outcomes.",
    "Return only the improved public-facing asset content.",
    "Do not include notes, JSON, markdown fences, explanations, internal IDs, review IDs, source asset IDs, prior asset IDs, or new asset IDs.",
    ...socialInstructions,
  ].join("\n");
}

export function buildQualityResubmissionPrompt(input: QualityResubmissionInput) {
  const strengths = toList(input.strengths);
  const improvements = toList(input.improvements);
  const scores = input.scores ?? {};
  const assetType = read(input.assetType, "generated_asset");

  return [
    systemPrompt(assetType),
    "",
    "PRIVATE CONTEXT — DO NOT PRINT THESE LABELS OR IDS IN THE OUTPUT.",
    `Title: ${read(input.assetTitle, "Untitled asset")}`,
    `Type: ${assetType}`,
    "",
    "Original content:",
    read(input.assetContent, ""),
    "",
    "Quality review scores:",
    `Overall: ${scores.overall ?? "N/A"}`,
    `Brand voice: ${scores.brandVoice ?? "N/A"}`,
    `Clarity: ${scores.clarity ?? "N/A"}`,
    `CTA: ${scores.cta ?? "N/A"}`,
    `SEO/AIO: ${scores.seoAio ?? "N/A"}`,
    `Conversion: ${scores.conversion ?? "N/A"}`,
    "",
    "Review summary:",
    read(input.reviewSummary, "No review summary provided."),
    "",
    buildSpecificityContractSection(),
    "",
    buildAssetTypeDetailStandardsSection([assetType]),
    "",
    "Strengths to preserve:",
    strengths.length ? strengths.map((item) => `- ${item}`).join("\n") : "- Preserve the best parts of the original asset.",
    "",
    "Improvements to apply:",
    improvements.length ? improvements.map((item) => `- ${item}`).join("\n") : "- Improve clarity, CTA strength, and brand fit.",
    "",
    "Suggested revision guidance:",
    read(input.suggestedRevision, "No specific suggested revision was provided."),
    "",
    "Resubmission requirements:",
    "- Create a stronger new version of the full asset.",
    "- Keep the asset useful and ready for human review.",
    "- Make the CTA clearer and more relevant.",
    "- Improve brand voice and remove generic AI phrasing.",
    "- Add specific examples, buyer pain points, workflow steps, objections, decision triggers, or practical consequences where relevant.",
    "- Improve SEO/AIO usefulness where relevant with better headings, topical clarity, FAQs, examples, or entity-rich language.",
    "- Do not mention that this was revised by AI or based on a quality review.",
    "- Do not include a score or review commentary in the output.",
    "- Do not include asset IDs, review IDs, source IDs, internal tracking text, or private context labels in the output.",
  ].join("\n");
}

function extractTextFromResponsesApi(payload: Record<string, any>) {
  if (typeof payload.output_text === "string") {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const parts: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const contentItem of content) {
      if (typeof contentItem?.text === "string") {
        parts.push(contentItem.text);
      } else if (typeof contentItem?.text?.value === "string") {
        parts.push(contentItem.text.value);
      }
    }
  }

  return parts.join("\n").trim();
}

export async function generateQualityResubmission(input: QualityResubmissionInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const prompt = buildQualityResubmissionPrompt(input);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 5000,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed: ${response.status} ${response.statusText} — ${text.slice(0, 800)}`
    );
  }

  let payload: Record<string, any>;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Unable to parse OpenAI response: ${text.slice(0, 500)}`);
  }

  const rawContent = extractTextFromResponsesApi(payload);

  if (!rawContent) {
    throw new Error("OpenAI returned an empty resubmission response.");
  }

  const content = preparePublicAssetContent({
    content: rawContent,
    assetType: input.assetType,
    title: input.assetTitle,
  });

  if (!content) {
    throw new Error("OpenAI returned content, but it was empty after public-content cleanup.");
  }

  return {
    content,
    model,
    prompt,
  };
}
