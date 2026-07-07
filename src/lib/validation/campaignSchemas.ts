import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name is required."),
  serviceLine: z.string().min(2, "Service line is required.").optional(),
  serviceLineId: z.string().uuid().optional(),
  offerId: z.string().uuid().optional(),
  buyerSegment: z.string().min(2, "Buyer segment is required."),
  idea: z.string().min(10, "Campaign idea needs more detail."),
  audience: z.string().optional(),
  goal: z.string().min(3, "Campaign goal is required."),
  platforms: z.array(z.string()).default([]),
  tone: z.string().optional(),
  cta: z.string().min(3, "CTA is required."),
  notes: z.string().optional(),
  differentiator: z.string().optional(),
  proofPoints: z.string().optional(),
  originalityAngle: z.string().optional(),
  objections: z.string().optional(),
  strategyContext: z.string().optional(),
  sourceContext: z.string().optional()
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const reviseAssetSchema = z.object({
  notes: z.string().min(3, "Revision notes are required.")
});

export type ReviseAssetInput = z.infer<typeof reviseAssetSchema>;
