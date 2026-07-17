import type { CampaignIntelligenceContext } from "@/lib/content-generation/campaign-intelligence";
import type { OneOffPromptCampaign } from "@/lib/content-generation/one-off-campaign-brief";
import { blockingBriefConflicts, resolveCampaignBrief } from "@/lib/content-generation/strategy-engine-v2/campaign-brief-resolver";
import { buildRepairSystemPrompt, buildRepairUserPrompt, buildStrategySystemPrompt, buildStrategyUserPrompt } from "@/lib/content-generation/strategy-engine-v2/prompts";
import { applyDeterministicStrategySafeguards, buildDeterministicStrategy } from "@/lib/content-generation/strategy-engine-v2/strategy-fallbacks";
import { criticalStrategyIssues, validateStrategy } from "@/lib/content-generation/strategy-engine-v2/strategy-validator";
import type { StrategyEngineDiagnostics } from "@/lib/content-generation/strategy-engine-v2/types";
import { normalizeOneOffCampaignStrategy, oneOffStrategyMissingRequired, type OneOffCampaignStrategy } from "@/lib/content-generation/one-off-strategy-gate";

type OpenAiMessage = { role: "system" | "user"; content: string };
function safeJsonParse(value: string) { try { return JSON.parse(value) as unknown; } catch { return null; } }
function extractJson(value: string) {
  const direct = safeJsonParse(value); if (direct) return direct;
  const first = value.indexOf("{"); const last = value.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  return safeJsonParse(value.slice(first, last + 1));
}
function timeoutMs() { const parsed = Number(process.env.VIP_STRATEGY_OPENAI_TIMEOUT_MS); return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000; }
function initialStrategyModel() { return process.env.OPENAI_STRATEGY_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini"; }
function repairStrategyModel() { return process.env.OPENAI_STRATEGY_QUALITY_MODEL ?? process.env.OPENAI_STRATEGY_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1"; }
async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs());
  try { return await fetch(url, { ...init, signal: controller.signal }); } finally { clearTimeout(timeout); }
}
async function requestStrategyJson({ apiKey, messages, model, temperature }: { apiKey: string; messages: OpenAiMessage[]; model: string; temperature: number }) {
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature, response_format: { type: "json_object" }, messages }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`OpenAI strategy request failed: ${response.status} ${response.statusText} — ${text}`);
  const payload = safeJsonParse(text);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("OpenAI returned an unexpected strategy response.");
  const choices = (payload as Record<string, unknown>).choices;
  if (!Array.isArray(choices)) throw new Error("OpenAI strategy response did not include choices.");
  const message = (choices[0] as Record<string, unknown> | undefined)?.message;
  const content = message && typeof message === "object" && !Array.isArray(message) ? (message as Record<string, unknown>).content : null;
  if (typeof content !== "string") throw new Error("OpenAI strategy response did not include message content.");
  const strategy = normalizeOneOffCampaignStrategy(extractJson(content));
  if (oneOffStrategyMissingRequired(strategy).length) throw new Error("OpenAI strategy response was missing required strategy fields.");
  return strategy;
}
function diagnostics({ brief, validationIssueCount, repairPassUsed, deterministicSafeguardsUsed }: { brief: ReturnType<typeof resolveCampaignBrief>; validationIssueCount: number; repairPassUsed: boolean; deterministicSafeguardsUsed: boolean }): StrategyEngineDiagnostics {
  return {
    version: brief.version,
    promotedOffer: brief.promotedOffer.name,
    offerSource: brief.promotedOffer.source,
    offerCategory: brief.promotedOffer.category,
    selectedAccountOffer: brief.promotedOffer.selectedAccountOfferName,
    ignoredOffers: brief.promotedOffer.ignoredOfferNames,
    conflicts: brief.promotedOffer.conflicts,
    validationIssueCount,
    repairPassUsed,
    deterministicSafeguardsUsed,
  };
}

export async function generateOneOffCampaignStrategy({ campaign, intelligence }: { campaign: OneOffPromptCampaign; intelligence: CampaignIntelligenceContext }): Promise<{ strategy: OneOffCampaignStrategy; generator: "openai" | "fallback"; diagnostics: StrategyEngineDiagnostics }> {
  const brief = resolveCampaignBrief({ campaign, intelligence });
  const blockingConflicts = blockingBriefConflicts(brief);
  if (blockingConflicts.length) throw new Error(blockingConflicts.map((conflict) => conflict.message).join(" "));
  const fallback = buildDeterministicStrategy(brief);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const issues = validateStrategy({ strategy: fallback, brief });
    return { strategy: fallback, generator: "fallback", diagnostics: diagnostics({ brief, validationIssueCount: issues.length, repairPassUsed: false, deterministicSafeguardsUsed: true }) };
  }
  try {
    let strategy = await requestStrategyJson({ apiKey, model: initialStrategyModel(), temperature: 0.35, messages: [{ role: "system", content: buildStrategySystemPrompt() }, { role: "user", content: buildStrategyUserPrompt(brief) }] });
    let issues = validateStrategy({ strategy, brief });
    let repairPassUsed = false; let deterministicSafeguardsUsed = false;
    if (issues.length) {
      repairPassUsed = true;
      try {
        strategy = await requestStrategyJson({ apiKey, model: repairStrategyModel(), temperature: 0.2, messages: [{ role: "system", content: buildRepairSystemPrompt() }, { role: "user", content: buildRepairUserPrompt({ brief, strategy, issues }) }] });
      } catch (repairError) {
        console.error("H1.9 strategy repair request failed; using deterministic safeguards.", repairError);
      }
      issues = validateStrategy({ strategy, brief });
    }
    if (issues.length) {
      deterministicSafeguardsUsed = true;
      strategy = applyDeterministicStrategySafeguards({ strategy, brief, issues });
      issues = validateStrategy({ strategy, brief });
    }
    if (criticalStrategyIssues(issues).length) {
      deterministicSafeguardsUsed = true;
      strategy = fallback;
      issues = validateStrategy({ strategy, brief });
    }
    return { strategy, generator: criticalStrategyIssues(issues).length ? "fallback" : "openai", diagnostics: diagnostics({ brief, validationIssueCount: issues.length, repairPassUsed, deterministicSafeguardsUsed }) };
  } catch (error) {
    console.error("H1.9 strategy generation failed; using the canonical deterministic strategy.", error);
    const issues = validateStrategy({ strategy: fallback, brief });
    return { strategy: fallback, generator: "fallback", diagnostics: diagnostics({ brief, validationIssueCount: issues.length, repairPassUsed: false, deterministicSafeguardsUsed: true }) };
  }
}
