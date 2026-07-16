import { sanitizeCampaignStrategyContext } from "@/lib/content-generation/campaign-context-sanitizer";
import type { CreateCampaignInput } from "@/lib/validation/campaignSchemas";

export function normalizeOneOffCampaignRequestBody(rawBody: Record<string, unknown>) {
  return {
    ...rawBody,
    serviceLineId:
      rawBody.serviceLineId ?? rawBody.service_line_id ?? undefined,
    offerId: rawBody.offerId ?? rawBody.offer_id ?? undefined,
    buyerSegment:
      rawBody.buyerSegment ?? rawBody.buyer_segment ?? undefined,
  };
}

export function buildOneOffCampaignStoredStrategy(input: CreateCampaignInput) {
  const sanitizedStrategyContext = sanitizeCampaignStrategyContext(
    input.strategyContext,
  );

  return {
    source: "one_off_campaign_builder",
    workflowVersion: "h1.8b2",
    serviceLineId: input.serviceLineId ?? null,
    offerId: input.offerId ?? null,
    buyerSegment: input.buyerSegment,
    audience: input.audience ?? input.buyerSegment,
    goal: input.goal,
    tone: input.tone ?? "Clear, practical, confident",
    cta: input.cta,
    differentiator: input.differentiator ?? null,
    proofPoints: input.proofPoints ?? null,
    originalityAngle: input.originalityAngle ?? null,
    objections: input.objections ?? null,
    strategyContext: sanitizedStrategyContext || null,
    sourceContext: input.sourceContext ?? null,
    capturedAt: new Date().toISOString(),
  };
}

export function buildOneOffCampaignNotes(input: CreateCampaignInput) {
  const sanitizedStrategyContext = sanitizeCampaignStrategyContext(
    input.strategyContext,
  );

  return [
    input.serviceLine ? `Service line: ${input.serviceLine}` : null,
    input.notes || null,
    input.differentiator
      ? `Differentiator:\n${input.differentiator}`
      : null,
    input.proofPoints ? `Proof points:\n${input.proofPoints}` : null,
    input.originalityAngle
      ? `Originality angle:\n${input.originalityAngle}`
      : null,
    input.objections
      ? `Objections to address:\n${input.objections}`
      : null,
    sanitizedStrategyContext
      ? `Strategy context selected from Settings / Brand Voice:\n${sanitizedStrategyContext}`
      : null,
    input.sourceContext
      ? `Knowledge and source context:\n${input.sourceContext}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildOneOffCampaignSource(input: CreateCampaignInput) {
  return {
    name: input.name,
    idea: input.idea,
    buyer_segment: input.buyerSegment,
    audience: input.audience ?? input.buyerSegment,
    goal: input.goal,
    platforms: input.platforms,
    tone: input.tone ?? "Clear, practical, confident",
    cta: input.cta,
    notes: buildOneOffCampaignNotes(input) || null,
    strategy: buildOneOffCampaignStoredStrategy(input),
    service_line_id: input.serviceLineId ?? null,
    offer_id: input.offerId ?? null,
  };
}
