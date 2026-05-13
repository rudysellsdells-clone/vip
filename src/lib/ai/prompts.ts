import type { MarketingAssetPackPromptInput } from "./types";

function truncate(value: string | null | undefined, maxLength: number) {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function bulletList(items: string[]) {
  if (!items.length) return "- Not available yet";
  return items.map((item) => `- ${item}`).join("\n");
}

export function buildMarketingAssetPackSystemPrompt() {
  return `You are Rudy's Marketing Twin, an AI business clone built to help Rudy McCormick make money with his services.

Your job is to create revenue-focused marketing campaign assets that Rudy can review and approve.

Core business focus:
- AIO — AI Optimization
- SEO — Search Engine Optimization
- Web Development
- Content Creation
- Performance Marketing / Paid Ads
- Marketing Automation
- Local Visibility / Local SEO
- Website Health, Speed, and Conversion Improvements

Primary buyer segments:
- Contractors
- Mid-sized manufacturers
- Machine shops
- Dental practices
- Legal firms

Successful sales outcomes:
- Project contracts
- Monthly retainers

Voice rules:
- Clear, direct, polished, human, strategic, and marketing-focused
- Practical over flashy
- Explain AI in plain English
- Avoid vague hype
- Avoid robotic phrasing
- Focus on business outcomes, trust, visibility, leads, conversion, and revenue
- Make CTAs specific

Safety and approval rules:
- Draft only
- Do not claim that anything has been published, sent, or launched
- Do not imply paid ads are live
- Do not make unverifiable performance claims
- No external action is taken without Rudy's approval`;
}

export function buildMarketingAssetPackUserPrompt(input: MarketingAssetPackPromptInput) {
  const campaign = input.campaign;

  const serviceLines = bulletList(
    (input.serviceLines ?? []).map((item) =>
      `${item.name ?? "Unnamed service"}: ${truncate(item.description, 220)}`
    )
  );

  const buyerSegments = bulletList(
    (input.buyerSegments ?? []).map((item) => {
      const pains = item.common_pains?.length ? ` Pains: ${item.common_pains.join(", ")}.` : "";
      const outcomes = item.desired_outcomes?.length
        ? ` Desired outcomes: ${item.desired_outcomes.join(", ")}.`
        : "";
      return `${item.name ?? "Unnamed buyer"}: ${truncate(item.description, 180)}${pains}${outcomes}`;
    })
  );

  const offers = bulletList(
    (input.offers ?? []).map((item) =>
      `${item.name ?? "Unnamed offer"}: ${truncate(item.description, 180)} Outcome: ${truncate(
        item.outcome,
        160
      )} CTA: ${item.primary_cta ?? "Not specified"}`
    )
  );

  const brandRules = bulletList(
    (input.brandRules ?? []).map((item) => `${item.category ?? "rule"}: ${item.rule_text ?? ""}`)
  );

  const knowledge = bulletList(
    (input.knowledgeSources ?? []).map((item) =>
      `${item.title ?? "Knowledge"}: ${truncate(item.summary || item.content, 500)}`
    )
  );

  const cloneProfile = input.digitalCloneProfile;

  return `Create a complete Marketing Asset Pack for this campaign.

Digital clone context:
Name: ${cloneProfile?.name ?? "Rudy's Marketing Twin"}
Purpose: ${cloneProfile?.purpose ?? "Help Rudy generate revenue with marketing and sales assets."}
Voice summary: ${cloneProfile?.voice_summary ?? "Clear, direct, polished, human, strategic, and marketing-focused."}
Business summary: ${cloneProfile?.business_summary ?? "Digital marketing and AI optimization services."}
Audience summary: ${cloneProfile?.audience_summary ?? "Contractors, manufacturers, machine shops, dental practices, and legal firms."}
Offer summary: ${cloneProfile?.offer_summary ?? "Project contracts and monthly retainers."}
Sales outcome summary: ${cloneProfile?.sales_outcome_summary ?? "Project contracts and monthly retainers."}

Campaign details:
Campaign name: ${campaign.name}
Campaign idea: ${campaign.idea}
Buyer segment: ${campaign.buyer_segment ?? "Not specified"}
Audience: ${campaign.audience ?? campaign.buyer_segment ?? "Not specified"}
Goal: ${campaign.goal ?? "Not specified"}
Platforms: ${campaign.platforms?.join(", ") || "Email, LinkedIn, Facebook, YouTube"}
Tone: ${campaign.tone ?? "Clear, practical, confident"}
CTA: ${campaign.cta ?? "Not specified"}
Notes: ${campaign.notes ?? "None"}

Known service lines:
${serviceLines}

Known buyer segments:
${buyerSegments}

Known offers:
${offers}

Brand and writing rules:
${brandRules}

Useful business knowledge:
${knowledge}

Required output:
1. Campaign strategy
2. Email draft
3. LinkedIn post
4. Facebook post
5. YouTube title
6. YouTube description
7. Short video script
8. GalaxyAI creative prompt
9. Approval checklist

Write each asset so it can be reviewed by Rudy before use. Do not say it has been posted, sent, or launched.`;
}

export function formatCampaignStrategyForAsset(strategy: {
  summary: string;
  audienceAngle: string;
  coreMessage: string;
  positioning: string;
  cta: string;
}) {
  return `Summary:\n${strategy.summary}\n\nAudience angle:\n${strategy.audienceAngle}\n\nCore message:\n${strategy.coreMessage}\n\nPositioning:\n${strategy.positioning}\n\nCTA:\n${strategy.cta}`;
}
