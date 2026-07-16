import type { CampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import {
  buildFallbackOneOffStrategy,
  normalizeOneOffCampaignStrategy,
  oneOffStrategyMissingRequired,
  type OneOffCampaignStrategy,
} from "@/lib/content-generation/one-off-strategy-gate";
import type { OneOffPromptCampaign } from "@/lib/content-generation/one-off-campaign-brief";

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractJson(value: string) {
  const direct = safeJsonParse(value);
  if (direct) return direct;

  const first = value.indexOf("{");
  const last = value.lastIndexOf("}");
  if (first < 0 || last <= first) return null;

  return safeJsonParse(value.slice(first, last + 1));
}

function timeoutMs() {
  const parsed = Number(process.env.VIP_STRATEGY_OPENAI_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 22000;
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function strategySystemPrompt() {
  return `You are Marketing VIP's senior campaign strategist.

Your only job in this step is to create a persuasive, specific campaign strategy for human approval. Do not write the email, blog, social posts, video script, or other public assets yet.

Strategy standard:
- Synthesize the source material. Do not paste Brand Voice, Account Strategy, knowledge, campaign-form language, or field labels into the strategy.
- Replace vague phrases such as "build trust," "increase visibility," "grow the business," "easy marketing," or "save time" with a specific buyer situation, problem, consequence, mechanism, and desired decision.
- The point of view must be distinctive enough that a random competitor could not use it unchanged.
- Explain the offer precisely: what happens, what the buyer receives, and what decision or outcome becomes easier afterward.
- Use only supplied proof. Never invent statistics, testimonials, case studies, guarantees, rankings, or deliverables.
- Treat inferred context as a strategic hypothesis, not factual proof.
- Address a believable objection honestly.
- Build a logical message progression that every channel can inherit.
- Write polished internal strategy in everyday business English. Do not include prompt instructions or meta-commentary.

Return only valid JSON with exactly these string fields:
{
  "campaignObjective": "string",
  "targetAudience": "string",
  "buyerSituation": "string",
  "coreProblem": "string",
  "businessConsequence": "string",
  "campaignPointOfView": "string",
  "offerExplanation": "string",
  "offerDeliverables": "string",
  "proofAndSupport": "string",
  "objectionsAndResponse": "string",
  "messageProgression": "string",
  "primaryCta": "string",
  "contentDirection": "string"
}`;
}

function strategyUserPrompt({
  campaign,
  intelligence,
}: {
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
}) {
  return `Create the campaign strategy that must be reviewed and approved before any assets are written.

## Campaign identity
Name: ${campaign.name}
Campaign idea: ${campaign.idea}
Intended audience: ${campaign.audience || campaign.buyer_segment || "Not explicitly supplied"}
Business goal: ${campaign.goal || "Not explicitly supplied"}
Primary CTA: ${campaign.cta || "Not explicitly supplied"}
Tone constraint: ${campaign.tone || "Clear, practical, confident"}
Platforms planned: ${(campaign.platforms ?? []).join(", ") || "Email, LinkedIn, Facebook, YouTube"}

${intelligence.formattedBrief}

## Campaign-relevant private source context
${intelligence.formattedContext}

## Required synthesis
1. Decide the real buyer situation and decision moment.
2. Define the visible problem and the more important underlying problem.
3. Explain the operational, financial, or opportunity consequence without manufacturing numbers.
4. State a clear campaign point of view rather than repeating a generic differentiator.
5. Explain the offer mechanism and deliverables in concrete terms.
6. Separate approved proof from assumptions.
7. Address the strongest objection and provide an honest response.
8. Define the message progression and channel direction.
9. Keep all raw settings and source labels private.

Return only valid JSON.`;
}

export async function generateOneOffCampaignStrategy({
  campaign,
  intelligence,
}: {
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
}): Promise<{
  strategy: OneOffCampaignStrategy;
  generator: "openai" | "fallback";
}> {
  const fallback = buildFallbackOneOffStrategy({
    campaign,
    brief: intelligence.brief,
  });
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return { strategy: fallback, generator: "fallback" };
  }

  try {
    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_STRATEGY_MODEL ??
            process.env.OPENAI_MODEL ??
            "gpt-4.1-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: strategySystemPrompt() },
            { role: "user", content: strategyUserPrompt({ campaign, intelligence }) },
          ],
        }),
      },
    );

    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `OpenAI strategy request failed: ${response.status} ${response.statusText} — ${text}`,
      );
    }

    const payload = safeJsonParse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("OpenAI returned an unexpected strategy response.");
    }

    const choices = (payload as Record<string, unknown>).choices;
    if (!Array.isArray(choices)) {
      throw new Error("OpenAI strategy response did not include choices.");
    }

    const message = (choices[0] as Record<string, unknown> | undefined)?.message;
    const content =
      message && typeof message === "object" && !Array.isArray(message)
        ? (message as Record<string, unknown>).content
        : null;

    if (typeof content !== "string") {
      throw new Error("OpenAI strategy response did not include message content.");
    }

    const strategy = normalizeOneOffCampaignStrategy(extractJson(content));
    if (oneOffStrategyMissingRequired(strategy).length) {
      throw new Error("OpenAI strategy response was missing required strategy fields.");
    }

    return { strategy, generator: "openai" };
  } catch (error) {
    console.error(
      "One-off strategy generation failed; using a reviewable deterministic draft.",
      error,
    );
    return { strategy: fallback, generator: "fallback" };
  }
}
