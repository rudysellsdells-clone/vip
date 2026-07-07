export type AudiencePerspective = {
  readerLabel: string;
  directAddress: string;
  decisionRole: string;
  businessContext: string;
  everydayConcerns: string[];
  exampleSituations: string[];
};

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lowercaseFirst(value: string) {
  if (!value) return value;
  if (/^[A-Z]{2,}$/.test(value)) return value;

  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^(AI|AIO|SEO|CRM|PPC)$/i.test(word)) return word.toUpperCase();
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

function pluralToOwnerLabel(value: string) {
  const normalized = clean(value)
    .replace(/\bpractices\b/gi, "practice")
    .replace(/\bcompanies\b/gi, "company")
    .replace(/\bbusinesses\b/gi, "business")
    .trim();

  if (!normalized) return "business owners";
  if (/owners?|managers?|leaders?|directors?|operators?/i.test(normalized)) {
    return lowercaseFirst(normalized);
  }

  return `${lowercaseFirst(normalized)} owners`;
}

export function resolveAudiencePerspective(audience: unknown): AudiencePerspective {
  const rawAudience = clean(audience);
  const lower = rawAudience.toLowerCase();

  if (/dental|dentist|orthodont|periodont|endodont|practice/.test(lower)) {
    return {
      readerLabel: "dental practice owners",
      directAddress: "your dental practice",
      decisionRole: "the owner, managing dentist, or office manager responsible for keeping the schedule full",
      businessContext: "a local dental practice competing for new patients, reviews, appointment requests, and visibility in search and AI answers",
      everydayConcerns: [
        "patients choosing another office before they ever call",
        "not knowing why the practice is missing from local search results or AI answers",
        "having too little time to sort through SEO, website, review, and content advice",
        "needing clear recommendations without a hard sell",
      ],
      exampleSituations: [
        "a patient searching for a nearby dentist after work",
        "a parent comparing reviews before booking a child’s appointment",
        "someone asking an AI tool which local office handles a specific dental need",
        "a practice owner wondering why competitors keep showing up first",
      ],
    };
  }

  if (/contractor|construction|builder|remodel|roof|hvac|plumb|electric|landscap|trade/.test(lower)) {
    return {
      readerLabel: "contractors and trade business owners",
      directAddress: "your contracting business",
      decisionRole: "the owner or operator who needs better-fit jobs and less wasted time chasing weak leads",
      businessContext: "a local service business competing for visible, credible, profitable project opportunities",
      everydayConcerns: [
        "spending time on leads that never become real projects",
        "not knowing which marketing fixes will actually help",
        "being compared against cheaper competitors before value is clear",
        "needing more qualified conversations without adding another full-time marketing role",
      ],
      exampleSituations: [
        "a homeowner comparing contractors before requesting an estimate",
        "a property manager searching for a reliable local provider",
        "a business owner trying to fill the schedule with profitable work",
        "a contractor wondering why competitors appear first in search results",
      ],
    };
  }

  if (/healthcare|clinic|medical|provider|therapy|treatment|senior|care/.test(lower)) {
    return {
      readerLabel: "healthcare business leaders",
      directAddress: "your organization",
      decisionRole: "the leader responsible for earning trust and turning interest into the right next step",
      businessContext: "a care-focused organization where trust, clarity, and timing matter before someone reaches out",
      everydayConcerns: [
        "people researching options before they are ready to talk",
        "explaining services clearly without overwhelming families or patients",
        "building trust before the first call",
        "helping people understand the next step without pressure",
      ],
      exampleSituations: [
        "a family comparing care options after a stressful conversation",
        "a patient researching providers before calling",
        "a referral partner looking for a clear reason to recommend the organization",
        "a leader trying to make the website and follow-up process easier to understand",
      ],
    };
  }

  const readerLabel = pluralToOwnerLabel(rawAudience || "business owners");

  return {
    readerLabel,
    directAddress: readerLabel.includes("owners") ? "your business" : `your ${lowercaseFirst(rawAudience || "business")}`,
    decisionRole: "the person responsible for deciding what to fix, where to spend time, and what next step makes sense",
    businessContext: `a business trying to earn trust, become easier to find, and turn interest into qualified conversations`,
    everydayConcerns: [
      "not knowing which marketing issue to fix first",
      "spending time on tactics that do not lead to better conversations",
      "needing clear recommendations instead of vague marketing advice",
      "wanting the next step to feel practical and safe",
    ],
    exampleSituations: [
      "a buyer comparing options before reaching out",
      "a business owner trying to understand why competitors are easier to find",
      "a prospect looking for a clear reason to trust the company",
      "a team deciding what marketing fix should come first",
    ],
  };
}

export function publicAudienceLabel(audience: unknown) {
  return resolveAudiencePerspective(audience).readerLabel;
}

export function publicAudienceTitle(audience: unknown) {
  return titleCase(publicAudienceLabel(audience));
}

export function directAudienceAddress(audience: unknown) {
  return resolveAudiencePerspective(audience).directAddress;
}

export function buildAudiencePerspectivePrompt({
  audience,
  topic,
  offer,
}: {
  audience: unknown;
  topic?: unknown;
  offer?: unknown;
}) {
  const perspective = resolveAudiencePerspective(audience);
  const topicText = clean(topic) || "the campaign topic";
  const offerText = clean(offer) || "the next step";

  return [
    "## Audience Perspective Lock",
    `Final reader: ${perspective.readerLabel}.`,
    `Write to: ${perspective.decisionRole}.`,
    `Business context: ${perspective.businessContext}.`,
    `Direct-address phrase to use naturally when useful: ${perspective.directAddress}.`,
    `Topic to explain in plain language: ${topicText}.`,
    `Offer or next step to connect naturally: ${offerText}.`,
    "",
    "Everyday reader concerns to keep in mind:",
    ...perspective.everydayConcerns.map((concern) => `- ${concern}`),
    "",
    "Useful example situations you may reference safely:",
    ...perspective.exampleSituations.map((example) => `- ${example}`),
    "",
    "Perspective rules:",
    "- Write for the final buyer/owner/operator, not for a marketer, agency strategist, or campaign planner.",
    "- Do not talk about this as a campaign, content plan, marketing message, article assignment, or asset brief.",
    "- Do not say what the content should do. Just write the finished public content.",
    "- Avoid phrases like the reader, the buyer, this week's campaign, this content, this article should, generic messaging, or a useful article should.",
    "- Use everyday language the final reader would understand without knowing marketing terminology.",
    "- Lead the reader from a real-world problem to a useful insight and then to the next step.",
  ].join("\n");
}
