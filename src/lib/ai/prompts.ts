type CampaignForPrompt = {
  name: string;
  idea: string;
  buyer_segment: string | null;
  audience: string | null;
  goal: string | null;
  platforms: string[] | null;
  tone: string | null;
  cta: string | null;
  notes: string | null;
};

type ContextItem = {
  name?: string | null;
  title?: string | null;
  description?: string | null;
  rule_text?: string | null;
  content?: string | null;
  summary?: string | null;
  [key: string]: unknown;
};

type CampaignStrategy = {
  summary?: string | null;
  audienceAngle?: string | null;
  coreMessage?: string | null;
  positioning?: string | null;
  cta?: string | null;
  [key: string]: unknown;
};

type BuildMarketingAssetPackUserPromptInput = {
  campaign: CampaignForPrompt;
  digitalCloneProfile?: ContextItem | null;
  serviceLines?: ContextItem[] | null;
  buyerSegments?: ContextItem[] | null;
  offers?: ContextItem[] | null;
  brandRules?: ContextItem[] | null;
  knowledgeSources?: ContextItem[] | null;
};

function listContextItems(items?: ContextItem[] | null, fallback = "None available yet.") {
  if (!items?.length) {
    return fallback;
  }

  return items
    .map((item, index) => {
      const label = item.name ?? item.title ?? `Item ${index + 1}`;
      const detail =
        item.description ??
        item.rule_text ??
        item.summary ??
        item.content ??
        "";
      return `- ${label}${detail ? `: ${detail}` : ""}`;
    })
    .join("\n");
}

export function buildMarketingAssetPackSystemPrompt() {
  return `
You are Rudy's Marketing Twin.

Your job is to help Rudy McCormick make money with his services by creating clear, practical, revenue-focused marketing campaigns.

Rudy sells:
- AIO — AI Optimization
- SEO — Search Engine Optimization
- Web Development
- Content Creation
- Performance Marketing / Paid Ads
- Marketing Automation
- Local Visibility / Local SEO
- Website Health, Speed, and Conversion Improvements

Rudy's best buyers are:
- Contractors
- Mid-sized manufacturers
- Machine shops
- Dental practices
- Legal firms

Successful sales outcomes are:
- Project contracts
- Monthly retainers

Voice rules:
- Clear, direct, polished, human, strategic, and marketing-focused
- Avoid robotic language
- Avoid vague hype
- Explain AI in plain English
- Focus on business outcomes
- Make CTAs specific

Guardrails:
- Draft only
- Do not publish
- Do not send
- Do not spend credits
- Do not contact prospects or clients without Rudy's approval

Return valid JSON only.
`;
}

export function buildMarketingAssetPackUserPrompt({
  campaign,
  digitalCloneProfile,
  serviceLines,
  buyerSegments,
  offers,
  brandRules,
  knowledgeSources,
}: BuildMarketingAssetPackUserPromptInput) {
  const platforms = campaign.platforms ?? [];

  return `
Create a Marketing Asset Pack for this campaign.

Campaign:
- Name: ${campaign.name}
- Idea: ${campaign.idea}
- Buyer segment: ${campaign.buyer_segment ?? "Not specified"}
- Audience: ${campaign.audience ?? campaign.buyer_segment ?? "Not specified"}
- Goal: ${campaign.goal ?? "Not specified"}
- Platforms: ${platforms.length ? platforms.join(", ") : "Not specified"}
- Tone: ${campaign.tone ?? "Clear, practical, confident"}
- CTA: ${campaign.cta ?? "Not specified"}
- Notes: ${campaign.notes ?? "None"}

Digital clone profile:
${digitalCloneProfile ? JSON.stringify(digitalCloneProfile, null, 2) : "No digital clone profile available yet."}

Service lines:
${listContextItems(serviceLines)}

Buyer segments:
${listContextItems(buyerSegments)}

Offers:
${listContextItems(offers)}

Brand rules:
${listContextItems(brandRules)}

Knowledge sources:
${listContextItems(knowledgeSources)}

Create these outputs:
1. Campaign strategy
2. Email draft
3. LinkedIn post
4. Facebook post
5. YouTube title
6. YouTube description
7. Short video script
8. GalaxyAI creative prompt
9. Approval checklist

Return JSON using exactly this structure:

{
  "campaignStrategy": {
    "summary": "",
    "audienceAngle": "",
    "coreMessage": "",
    "positioning": "",
    "cta": ""
  },
  "assets": [
    {
      "type": "email",
      "title": "",
      "content": "",
      "notes": ""
    },
    {
      "type": "linkedin_post",
      "title": "",
      "content": "",
      "notes": ""
    },
    {
      "type": "facebook_post",
      "title": "",
      "content": "",
      "notes": ""
    },
    {
      "type": "youtube_title",
      "title": "",
      "content": "",
      "notes": ""
    },
    {
      "type": "youtube_description",
      "title": "",
      "content": "",
      "notes": ""
    },
    {
      "type": "video_script",
      "title": "",
      "content": "",
      "notes": ""
    },
    {
      "type": "galaxyai_prompt",
      "title": "",
      "content": "",
      "notes": ""
    }
  ],
  "approvalChecklist": []
}
`;
}

export function formatCampaignStrategyForAsset(strategy: CampaignStrategy | null | undefined) {
  if (!strategy) {
    return "No campaign strategy was generated.";
  }

  const sections = [
    ["Summary", strategy.summary],
    ["Audience Angle", strategy.audienceAngle],
    ["Core Message", strategy.coreMessage],
    ["Positioning", strategy.positioning],
    ["CTA", strategy.cta],
  ];

  return sections
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([label, value]) => `## ${label}\n\n${value}`)
    .join("\n\n");
}

export function formatApprovalChecklistForMetadata(checklist: string[] | null | undefined) {
  return {
    approvalChecklist: checklist ?? [],
  };
}

export function formatApprovalChecklistForAsset(checklist: string[] | null | undefined) {
  if (!checklist?.length) {
    return "No approval checklist was generated.";
  }

  return checklist.map((item, index) => `${index + 1}. ${item}`).join("\n");
}
