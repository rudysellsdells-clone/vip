import type { CampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import type { OneOffPromptCampaign } from "@/lib/content-generation/one-off-campaign-brief";
import {
  assessOneOffStrategyPrecision,
  buildCustomerCenteredStrategySource,
  buildStrategyPrecisionSourceSnapshot,
  enforceOneOffStrategyPrecision,
  formatCustomerCenteredStrategySource,
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
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
}

function qualityPassEnabled() {
  return process.env.VIP_DISABLE_STRATEGY_QUALITY_PASS !== "1";
}

function initialStrategyModel() {
  return (
    process.env.OPENAI_STRATEGY_MODEL ??
    process.env.OPENAI_MODEL ??
    "gpt-4.1-mini"
  );
}

function qualityStrategyModel() {
  return (
    process.env.OPENAI_STRATEGY_QUALITY_MODEL ??
    process.env.OPENAI_STRATEGY_MODEL ??
    process.env.OPENAI_MODEL ??
    "gpt-4.1"
  );
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

function strategyJsonContract() {
  return `{
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

function strategySystemPrompt() {
  return `You are Marketing VIP's senior campaign strategist.

Your only job is to create a customer-centered Marketing Spine for human approval before any public assets are written.

The source contains four different kinds of information:
1. Customer facts: buyer description, pain signals, desired outcomes, and objections.
2. Campaign intent: topic, objective, CTA, tone, and channels.
3. Verified offer facts: offer name, process, outcome, type, price note, and confirmed deliverables.
4. Internal guidance: differentiator, originality angle, and creator notes.

Do not mix those categories. Internal guidance may shape your reasoning, but it is not customer language and must never be copied into a strategy field.

Use established marketing reasoning to bridge gaps safely:
- A Buyer Situation is the moment the customer recognizes that the current workaround is failing.
- A Core Problem is the customer-side cause behind the visible symptom. It is never the marketer's goal, the vendor's problem, or the campaign creator's frustration.
- A Business Consequence is the downstream operational, financial, competitive, or opportunity effect if the customer's problem continues.
- A Campaign Point of View is a defensible belief about why the familiar approach falls short and what should be done differently.
- An Offer Explanation describes the mechanism: how the offer examines, changes, organizes, connects, or prioritizes something for the customer.
- Offer Deliverables state only what the customer verifiably receives. Never manufacture a report, meeting, plan, implementation step, result, or guarantee.

Field logic:
- Campaign objective: define the belief, decision, or commercial action this campaign should make more likely. Do not write a slogan or a generic growth goal.
- Target audience: identify one primary decision-maker, their business context, and their responsibility. Never output a roster of industries.
- Buyer situation: write 2–3 logical sentences covering the trigger, current behavior or workaround, what has stopped working, and why the issue matters now.
- Core problem: explain the customer's underlying causal obstacle in 1–2 sentences. Do not mention Marketing VIP, Web Search Professionals, the user, the form, the campaign, or the creator's internal issue.
- Business consequence: explain what the customer loses, risks, delays, or cannot achieve if the problem continues. Do not restate the desired outcome.
- Campaign point of view: write a distinctive contrast between the familiar approach and the better approach.
- Offer explanation: explain how the offer works and why the mechanism helps. Do not paste a saved service or offer description.
- Offer deliverables: state the verified outputs separately from the mechanism. When deliverables are not established, say they need confirmation before approval.
- Proof and support: include only approved evidence. Knowledge summaries, aspirations, and offer outcomes are not proof.
- Objections and response: name one believable customer concern and answer it honestly without pressure.
- Message progression: create a coherent persuasion sequence from customer moment to CTA.
- Primary CTA: one concise next action.
- Content direction: assign a different strategic job to each planned channel.

Writing standard:
- Use complete, natural business sentences.
- Rewrite source ideas rather than stitching fields together.
- Do not output meta-language, prompt instructions, confidence labels, source labels, or phrases such as “the audience should understand.”
- Do not invent statistics, testimonials, rankings, results, customer stories, guarantees, or deliverables.
- Keep all thirteen fields meaningfully distinct.

Return only valid JSON with exactly these fields:
${strategyJsonContract()}`;
}

function strategyUserPrompt({
  campaign,
  intelligence,
}: {
  campaign: OneOffPromptCampaign;
  intelligence: CampaignIntelligenceContext;
}) {
  const source = buildCustomerCenteredStrategySource({ campaign, intelligence });

  return `Create the Marketing Spine that must be reviewed and approved before assets are written.

${formatCustomerCenteredStrategySource(source)}

Before returning JSON, perform these checks:
1. Every field answers its own strategic question.
2. Buyer Situation, Core Problem, and Business Consequence describe the customer—not the vendor or campaign creator.
3. Core Problem explains a cause; Business Consequence explains a downstream effect.
4. Offer Explanation describes a mechanism; Offer Deliverables describe verified outputs.
5. No field substantially repeats a source sentence or another strategy field.
6. No long audience list, raw Brand Voice wording, Account Strategy wording, creator notes, or internal labels appear.
7. Every sentence is logical when read aloud.

Return only valid JSON.`;
}

function qualityEditorSystemPrompt() {
  return `You are Marketing VIP's final strategy editor and marketing-logic reviewer.

You will receive a draft Marketing Spine, a complete field-by-field diagnostic, and a customer-centered source model. Perform a comprehensive quality pass across all thirteen fields—not just the fields named in the diagnostic.

Your job is to make the strategy logically sound, customer-centered, persuasive, specific, and ready for approval.

Mandatory reasoning sequence:
1. Identify the customer's real trigger and current workaround.
2. Distinguish the visible symptom from the underlying customer-side cause.
3. Trace the downstream consequence without inventing numbers.
4. State a useful point of view that changes how the customer interprets the problem.
5. Explain the offer's verified mechanism and deliverables separately.
6. Use only approved proof.
7. Make the CTA the logical conclusion of the argument.

Hard field boundaries:
- Campaign Objective = intended decision change.
- Target Audience = one decision-maker and business context.
- Buyer Situation = moment and current behavior.
- Core Problem = customer-side root cause.
- Business Consequence = downstream effect.
- Campaign Point of View = distinctive belief.
- Offer Explanation = mechanism.
- Offer Deliverables = verified outputs.
- Proof and Support = approved evidence or an honest no-proof statement.
- Objections and Response = concern plus direct answer.
- Message Progression = persuasion order.
- Primary CTA = one action.
- Content Direction = distinct channel roles.

Never:
- Describe the vendor's internal problem inside Buyer Situation, Core Problem, or Business Consequence.
- Paste Brand Voice, Account Strategy, campaign-form, service-description, offer-description, or creator-note sentences.
- Turn a desired outcome into a current problem or business consequence.
- Turn a knowledge-source summary into proof.
- Invent deliverables, results, data, customers, guarantees, or implementation steps.
- Use internal planning phrases such as “build a realistic moment,” “explain the consequence,” or “the audience should understand.”

Return all thirteen fields as valid JSON using exactly this contract:
${strategyJsonContract()}`;
}

function qualityEditorUserPrompt({
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
  return `Run the final comprehensive strategy quality pass.

## Field-by-field diagnostic
${formatStrategyPrecisionIssues(issues)}

## Customer-centered source model
${buildStrategyPrecisionSourceSnapshot({ campaign, intelligence })}

## Draft strategy JSON
${JSON.stringify(strategy, null, 2)}

Rewrite the complete strategy, including fields that appear acceptable, so the full spine works as one persuasive argument. Preserve verified facts, approved proof, and the CTA. Return only valid JSON.`;
}

async function requestStrategyJson({
  apiKey,
  messages,
  model,
  temperature,
}: {
  apiKey: string;
  messages: OpenAiMessage[];
  model: string;
  temperature: number;
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
        model,
        temperature,
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
      model: initialStrategyModel(),
      temperature: 0.45,
      messages: [
        { role: "system", content: strategySystemPrompt() },
        { role: "user", content: strategyUserPrompt({ campaign, intelligence }) },
      ],
    });

    const initialIssues = assessOneOffStrategyPrecision({
      strategy,
      campaign,
      intelligence,
    });

    if (qualityPassEnabled()) {
      try {
        strategy = await requestStrategyJson({
          apiKey,
          model: qualityStrategyModel(),
          temperature: 0.25,
          messages: [
            { role: "system", content: qualityEditorSystemPrompt() },
            {
              role: "user",
              content: qualityEditorUserPrompt({
                campaign,
                intelligence,
                strategy,
                issues: initialIssues,
              }),
            },
          ],
        });
      } catch (qualityError) {
        console.error(
          "One-off strategy comprehensive quality pass failed; applying deterministic customer-centered safeguards.",
          qualityError,
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
      "One-off strategy generation failed; using a reviewable deterministic customer-centered draft.",
      error,
    );
    return { strategy: fallback, generator: "fallback" };
  }
}
