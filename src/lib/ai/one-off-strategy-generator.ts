import type { CampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import type { OneOffPromptCampaign } from "@/lib/content-generation/one-off-campaign-brief";
import {
  assessOneOffStrategyPrecision,
  buildStrategyPrecisionSourceSnapshot,
  derivePrimaryAudience,
  enforceOneOffStrategyPrecision,
  formatStrategyPrecisionIssues,
} from "@/lib/content-generation/one-off-strategy-precision";
import {
  buildFallbackOneOffStrategy,
  normalizeOneOffCampaignStrategy,
  oneOffStrategyMissingRequired,
  type OneOffCampaignStrategy,
} from "@/lib/content-generation/one-off-strategy-gate";

type OpenAiMessage = {
  role: "system" | "user";
  content: string;
};

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

Section precision rules:
- Target audience: choose ONE primary decision-maker and business context. Do not repeat a full industry list. Use no more than two examples, only when examples materially clarify the category. Aim for 15–45 words.
- Buyer situation: describe a moment in time, not a demographic or pain-point list. State what is happening, what the buyer is doing now, what is no longer working, and why the issue matters at this moment. Aim for 2–3 sentences.
- Core problem: explain the underlying obstacle; do not repeat the buyer situation.
- Business consequence: explain what continuing the problem costs or prevents; do not restate the core problem.
- Campaign point of view: state the campaign's distinctive belief about why the usual approach falls short and what should be done differently.
- Offer explanation: explain how the offer works. Offer deliverables: separately state what the buyer receives.
- Every section must perform its own job. Do not recycle the same sentence, list, or phrasing across boxes.

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
  const primaryAudience = derivePrimaryAudience(campaign, intelligence);

  return `Create the campaign strategy that must be reviewed and approved before any assets are written.

## Campaign identity
Name: ${campaign.name}
Campaign idea: ${campaign.idea}
Primary audience to prioritize: ${primaryAudience}
Raw intended-audience source: ${campaign.audience || campaign.buyer_segment || "Not explicitly supplied"}
Business goal: ${campaign.goal || "Not explicitly supplied"}
Primary CTA: ${campaign.cta || "Not explicitly supplied"}
Tone constraint: ${campaign.tone || "Clear, practical, confident"}
Platforms planned: ${(campaign.platforms ?? []).join(", ") || "Email, LinkedIn, Facebook, YouTube"}

Audience decision: write the Target Audience box for the primary audience above. The raw audience source and account memory may contain examples or a longer market list; treat those as classification clues, never as text to reproduce.

${intelligence.formattedBrief}

## Campaign-relevant private source context
${intelligence.formattedContext}

## Required synthesis
1. Select one primary decision-maker rather than summarizing every saved audience.
2. Decide the real buyer situation and decision moment.
3. Define the visible problem and the more important underlying problem.
4. Explain the operational, financial, or opportunity consequence without manufacturing numbers.
5. State a clear campaign point of view rather than repeating a generic differentiator.
6. Explain the offer mechanism and deliverables in concrete, separate sections.
7. Separate approved proof from assumptions.
8. Address the strongest objection and provide an honest response.
9. Define the message progression and channel direction.
10. Compare all sections before returning JSON and rewrite any section that substantially repeats another.
11. Keep all raw settings, source lists, and source labels private.

Return only valid JSON.`;
}

function precisionEditorSystemPrompt() {
  return `You are Marketing VIP's campaign-strategy quality editor.

You receive an initial Marketing Spine and a focused diagnostic. Rewrite the full strategy so every section is precise, distinct, persuasive, and ready for human approval.

Hard rules:
- Preserve the supplied campaign facts, offer, approved proof, CTA, and strategic intent.
- Do not invent statistics, deliverables, results, testimonials, guarantees, or customer stories.
- Do not copy a raw audience list, Brand Voice field, Account Strategy field, source label, or diagnostic instruction into the result.
- Target one primary decision-maker. Never provide a roster of industries or trades.
- Make Buyer Situation a believable moment in time with a trigger, current behavior, failing approach, and reason to act now.
- Keep Core Problem, Business Consequence, Point of View, Offer Explanation, and Offer Deliverables meaningfully different.
- Return all thirteen fields, even when only several require rewriting.
- Return only valid JSON using exactly the same field names as the initial strategy.`;
}

function precisionEditorUserPrompt({
  campaign,
  intelligence,
  strategy,
  issues,
}: {
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
  strategy: OneOffCampaignStrategy;
  issues: ReturnType<typeof assessOneOffStrategyPrecision>;
}) {
  return `Refine this initial campaign strategy before it is shown for approval.

## Precision diagnostic
${formatStrategyPrecisionIssues(issues)}

## Prioritized source snapshot
${buildStrategyPrecisionSourceSnapshot({ campaign, intelligence })}

## Campaign identity
Campaign name: ${campaign.name}
Campaign idea: ${campaign.idea}
Business goal: ${campaign.goal || "Not explicitly supplied"}
CTA: ${campaign.cta || "Not explicitly supplied"}
Tone: ${campaign.tone || "Clear, practical, confident"}

## Initial strategy JSON
${JSON.stringify(strategy, null, 2)}

Rewrite the complete strategy. Return only valid JSON.`;
}

async function requestStrategyJson({
  apiKey,
  messages,
}: {
  apiKey: string;
  messages: OpenAiMessage[];
}) {
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
        messages,
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

  return strategy;
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
  const fallback = enforceOneOffStrategyPrecision({
    strategy: buildFallbackOneOffStrategy({
      campaign,
      brief: intelligence.brief,
    }),
    campaign,
    intelligence,
  });
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return { strategy: fallback, generator: "fallback" };
  }

  try {
    let strategy = await requestStrategyJson({
      apiKey,
      messages: [
        { role: "system", content: strategySystemPrompt() },
        { role: "user", content: strategyUserPrompt({ campaign, intelligence }) },
      ],
    });

    const precisionIssues = assessOneOffStrategyPrecision({
      strategy,
      campaign,
      intelligence,
    });

    if (precisionIssues.length) {
      try {
        strategy = await requestStrategyJson({
          apiKey,
          messages: [
            { role: "system", content: precisionEditorSystemPrompt() },
            {
              role: "user",
              content: precisionEditorUserPrompt({
                campaign,
                intelligence,
                strategy,
                issues: precisionIssues,
              }),
            },
          ],
        });
      } catch (precisionError) {
        console.error(
          "One-off strategy precision rewrite failed; applying deterministic precision safeguards.",
          precisionError,
        );
      }
    }

    return {
      strategy: enforceOneOffStrategyPrecision({
        strategy,
        campaign,
        intelligence,
      }),
      generator: "openai",
    };
  } catch (error) {
    console.error(
      "One-off strategy generation failed; using a reviewable deterministic draft.",
      error,
    );
    return { strategy: fallback, generator: "fallback" };
  }
}
