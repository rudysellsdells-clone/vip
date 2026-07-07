import { publicAudienceLabel, directAudienceAddress } from "@/lib/content-generation/audience-perspective";

export type CampaignDetailInput = {
  audience?: unknown;
  topic?: unknown;
  offer?: unknown;
  objective?: unknown;
  businessContext?: unknown;
  differentiator?: unknown;
  proofPoints?: unknown;
  objections?: unknown;
};

export type CampaignDetailContext = {
  campaignType: "ai_visibility_audit" | "marketing_audit" | "offer_explainer";
  readerLabel: string;
  directAddress: string;
  plainLanguageOffer: string;
  readerNeed: string;
  detailMandate: string;
  reviewAreas: string[];
  buyerQuestions: string[];
  outcomeDescription: string;
  bannedGenericMoves: string[];
};

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentence(value: string) {
  const cleaned = clean(value);

  if (!cleaned) return "";
  if (/[.!?]$/.test(cleaned)) return cleaned;

  return `${cleaned}.`;
}

function lower(value: unknown) {
  return clean(value).toLowerCase();
}

function hasAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function compactList(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned = clean(value);
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function readableOffer(offer: unknown, fallback: string) {
  const cleaned = clean(offer);

  if (!cleaned) return fallback;

  return cleaned
    .replace(/\bcomplimentary\b/gi, "complimentary")
    .replace(/\breview consultation\b/gi, "review consultation")
    .replace(/\bai\b/gi, "AI")
    .replace(/\bseo\b/gi, "SEO")
    .replace(/\baio\b/gi, "AIO");
}

export function resolveCampaignDetailContext(input: CampaignDetailInput): CampaignDetailContext {
  const readerLabel = publicAudienceLabel(input.audience);
  const directAddress = directAudienceAddress(input.audience);
  const combined = [
    input.audience,
    input.topic,
    input.offer,
    input.objective,
    input.businessContext,
    input.differentiator,
    input.proofPoints,
    input.objections,
  ]
    .map(lower)
    .filter(Boolean)
    .join(" ");

  const isDental = hasAny(combined, [/\bdental\b/, /\bdentist\b/, /\borthodont/i, /\bpractice owner/i]);
  const isAi = hasAny(combined, [/\bai\b/, /\baio\b/, /ai optimization/, /ai search/, /chatgpt/, /google ai/, /llm/]);
  const isAudit = hasAny(combined, [/audit/, /visibility review/, /review consultation/, /marketing review/, /site review/, /assessment/]);
  const isVisibility = hasAny(combined, [/visibility/, /search/, /seo/, /local pack/, /google business profile/, /maps/, /findable/]);

  if ((isAi && (isAudit || isVisibility)) || /ai audit|ai optimization/.test(combined)) {
    if (isDental) {
      return {
        campaignType: "ai_visibility_audit",
        readerLabel,
        directAddress,
        plainLanguageOffer: readableOffer(input.offer, "an AI visibility audit"),
        readerNeed:
          "a plain-English explanation of why the practice may not be showing up when potential patients search or ask AI tools for local dental options",
        detailMandate:
          "The first draft must explain what an AI audit looks at for a dental practice, why those areas matter to patient acquisition, and what the owner should expect to understand after the review.",
        reviewAreas: [
          "AI and search visibility — whether the practice appears clearly when people search or ask AI tools about local dental needs.",
          "Google Business Profile and local listings — whether the name, categories, services, location, hours, and trust signals are consistent enough to support local discovery.",
          "Website service pages — whether key services are explained in language patients understand before they call or book.",
          "Reviews and reputation signals — whether reviews support trust, common patient concerns, and the reasons someone would choose the practice.",
          "Content and FAQ gaps — whether the site answers practical questions about services, timing, insurance, financing, emergency needs, or new-patient expectations.",
          "Conversion path — whether a patient can quickly find the right next step, such as calling, requesting an appointment, or asking a question.",
        ],
        buyerQuestions: [
          "Why are nearby competitors easier to find?",
          "What is missing from the website, Google profile, or local visibility footprint?",
          "Are patients getting enough clear information before they decide who to call?",
          "Which fixes are urgent, and which can wait?",
          "What would make the practice easier to trust and easier to contact?",
        ],
        outcomeDescription:
          "a prioritized list of visibility, trust, content, and conversion fixes the practice can understand without needing to become a marketing expert",
        bannedGenericMoves: [
          "Do not merely say AI Optimization matters.",
          "Do not explain the campaign idea to a marketer.",
          "Do not make the audit sound mysterious or technical without explaining what is reviewed.",
          "Do not use generic lines like improve your online presence unless the sentence names the specific visibility issue.",
        ],
      };
    }

    return {
      campaignType: "ai_visibility_audit",
      readerLabel,
      directAddress,
      plainLanguageOffer: readableOffer(input.offer, "an AI visibility audit"),
      readerNeed:
        "a clear explanation of why the business may not be visible, credible, or easy to choose when people search or ask AI tools for options",
      detailMandate:
        "The first draft must explain what an AI visibility audit reviews, why each area matters, and what the business owner should understand after the review.",
      reviewAreas: [
        "Search and AI visibility — whether the business is findable when buyers look for answers, options, or providers.",
        "Website clarity — whether important services, locations, offers, and next steps are easy to understand.",
        "Local listings and profiles — whether public business information is consistent across places buyers may check.",
        "Reviews and trust signals — whether public proof helps buyers feel safe enough to take the next step.",
        "Content gaps — whether common buyer questions are answered before a sales conversation starts.",
        "Conversion path — whether the next step is obvious, low-friction, and tied to the buyer's real concern.",
      ],
      buyerQuestions: [
        "Why are competitors easier to find or understand?",
        "What is missing from the website, profiles, reviews, or content?",
        "Which issues are hurting trust or visibility now?",
        "What should be fixed first?",
      ],
      outcomeDescription:
        "a practical list of visibility, trust, content, and conversion recommendations that can be prioritized without guesswork",
      bannedGenericMoves: [
        "Do not merely say AI Optimization matters.",
        "Do not explain the campaign idea to a marketer.",
        "Do not use generic marketing filler when specific audit areas can be named.",
      ],
    };
  }

  if (isAudit || isVisibility) {
    return {
      campaignType: "marketing_audit",
      readerLabel,
      directAddress,
      plainLanguageOffer: readableOffer(input.offer, "a practical marketing review"),
      readerNeed:
        "a clearer way to see what is helping, what is missing, and what should be fixed first",
      detailMandate:
        "The first draft must explain what the review includes, what problems it can uncover, and how the owner can use the recommendations.",
      reviewAreas: [
        "Visibility — whether the business is easy to find when buyers are actively looking.",
        "Message clarity — whether the offer, services, and value are easy to understand quickly.",
        "Trust signals — whether reviews, proof, examples, and credibility cues support the decision.",
        "Content gaps — whether common questions and objections are answered before the buyer reaches out.",
        "Next-step friction — whether the CTA is clear and easy to act on.",
      ],
      buyerQuestions: [
        "What is actually holding us back?",
        "Where are buyers getting confused or dropping off?",
        "Which fixes matter first?",
        "What can we improve without wasting time on the wrong work?",
      ],
      outcomeDescription:
        "a focused set of recommendations that separates urgent fixes from nice-to-have marketing ideas",
      bannedGenericMoves: [
        "Do not stop at generic benefits.",
        "Do not describe the content strategy instead of the actual review.",
        "Do not copy planning notes into public copy.",
      ],
    };
  }

  const offer = readableOffer(input.offer, "the next step");

  return {
    campaignType: "offer_explainer",
    readerLabel,
    directAddress,
    plainLanguageOffer: offer,
    readerNeed:
      "a clear reason to understand the problem, trust the explanation, and know what to do next",
    detailMandate:
      "The first draft must explain the specific problem, why it matters now, what the offer helps clarify, and what the reader can do next.",
    reviewAreas: [
      "The problem the reader is likely noticing.",
      "Why the problem creates a real business consequence.",
      "What the offer helps clarify or solve.",
      "What a practical next step should look like.",
    ],
    buyerQuestions: [
      "Why does this matter now?",
      "What should we understand before we act?",
      "What would a practical first step look like?",
    ],
    outcomeDescription: `a clearer understanding of whether ${offer} is the right practical next step`,
    bannedGenericMoves: [
      "Do not write a generic overview.",
      "Do not repeat the offer without explaining why it matters.",
      "Do not describe the campaign instead of helping the final reader.",
    ],
  };
}

export function buildCampaignDetailPromptSection(input: CampaignDetailInput) {
  const context = resolveCampaignDetailContext(input);

  return [
    "## Campaign Idea Detail Mandate",
    "The first version must already include the level of detail a human reviewer would otherwise request in a V2.",
    `Final reader: ${context.readerLabel}.`,
    `Write directly to or for someone responsible for ${context.directAddress}.`,
    `Plain-language offer: ${context.plainLanguageOffer}.`,
    `Reader need: ${context.readerNeed}.`,
    sentence(context.detailMandate),
    "",
    "Specific details the draft should use naturally when relevant:",
    ...context.reviewAreas.map((area) => `- ${area}`),
    "",
    "Questions the content should help the reader answer:",
    ...context.buyerQuestions.map((question) => `- ${question}`),
    "",
    `Desired conclusion: the reader should understand that the next step can give them ${context.outcomeDescription}.`,
    "",
    "Generic-output prevention:",
    ...context.bannedGenericMoves.map((rule) => `- ${rule}`),
    "- Do not say the content, article, campaign, reader, or buyer should do something. Write the finished public copy.",
  ].join("\n");
}

export function campaignDetailBullets(input: CampaignDetailInput) {
  return resolveCampaignDetailContext(input).reviewAreas;
}

export function campaignBuyerQuestions(input: CampaignDetailInput) {
  return resolveCampaignDetailContext(input).buyerQuestions;
}
