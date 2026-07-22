import "server-only";

import type { StrategyFoundation } from "@/lib/strategy/strategy-foundation";

export type AutomatedMarketSource = {
  title: string;
  url: string;
  publisher: string;
  summary: string;
};

export type AutomatedCompetitorAnalysis = {
  name: string;
  websiteUrl: string;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  notableOffers: string[];
  sourceUrls: string[];
};

export type AutomatedMarketGap = {
  title: string;
  category:
    | "messaging"
    | "service"
    | "offer"
    | "content"
    | "search"
    | "proof"
    | "audience"
    | "geography";
  description: string;
  whyFillable: string;
  recommendedAction: string;
  confidenceScore: number;
  sourceUrls: string[];
};

export type AutomatedSearchDemand = {
  topic: string;
  intent: string;
  opportunity: string;
  confidenceScore: number;
  sourceUrls: string[];
};

export type AutomatedMarketRisk = {
  title: string;
  description: string;
  mitigation: string;
  confidenceScore: number;
  sourceUrls: string[];
};

export type AutomatedMarketReport = {
  version: "1.0";
  reportTitle: string;
  executiveSummary: string;
  marketPosition: string;
  competitors: AutomatedCompetitorAnalysis[];
  gaps: AutomatedMarketGap[];
  searchDemand: AutomatedSearchDemand[];
  risks: AutomatedMarketRisk[];
  sources: AutomatedMarketSource[];
};

const AUTOMATED_MARKET_REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "reportTitle",
    "executiveSummary",
    "marketPosition",
    "competitors",
    "gaps",
    "searchDemand",
    "risks",
    "sources",
  ],
  properties: {
    reportTitle: { type: "string" },
    executiveSummary: { type: "string" },
    marketPosition: { type: "string" },
    competitors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "websiteUrl",
          "positioning",
          "strengths",
          "weaknesses",
          "notableOffers",
          "sourceUrls",
        ],
        properties: {
          name: { type: "string" },
          websiteUrl: { type: "string" },
          positioning: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          notableOffers: { type: "array", items: { type: "string" } },
          sourceUrls: { type: "array", items: { type: "string" } },
        },
      },
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "category",
          "description",
          "whyFillable",
          "recommendedAction",
          "confidenceScore",
          "sourceUrls",
        ],
        properties: {
          title: { type: "string" },
          category: {
            type: "string",
            enum: [
              "messaging",
              "service",
              "offer",
              "content",
              "search",
              "proof",
              "audience",
              "geography",
            ],
          },
          description: { type: "string" },
          whyFillable: { type: "string" },
          recommendedAction: { type: "string" },
          confidenceScore: { type: "number" },
          sourceUrls: { type: "array", items: { type: "string" } },
        },
      },
    },
    searchDemand: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "intent", "opportunity", "confidenceScore", "sourceUrls"],
        properties: {
          topic: { type: "string" },
          intent: { type: "string" },
          opportunity: { type: "string" },
          confidenceScore: { type: "number" },
          sourceUrls: { type: "array", items: { type: "string" } },
        },
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "mitigation", "confidenceScore", "sourceUrls"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          mitigation: { type: "string" },
          confidenceScore: { type: "number" },
          sourceUrls: { type: "array", items: { type: "string" } },
        },
      },
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "publisher", "summary"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          publisher: { type: "string" },
          summary: { type: "string" },
        },
      },
    },
  },
} as const;

function text(value: unknown, maxLength = 6000) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trim()}...`
    : normalized;
}

function list(value: unknown, maxItems = 12) {
  return Array.isArray(value)
    ? value.map((item) => text(item, 700)).filter(Boolean).slice(0, maxItems)
    : [];
}

function score(value: unknown) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function safeUrl(value: unknown) {
  const candidate = text(value, 2000);
  if (!candidate) return "";

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

function extractOutputText(responseJson: any) {
  if (typeof responseJson.output_text === "string") return responseJson.output_text;
  const output = Array.isArray(responseJson.output) ? responseJson.output : [];

  return output
    .flatMap((item: any) => (Array.isArray(item.content) ? item.content : []))
    .filter((content: any) => content.type === "output_text" && typeof content.text === "string")
    .map((content: any) => content.text)
    .join("");
}

function extractResponseSources(responseJson: any): AutomatedMarketSource[] {
  const sources: AutomatedMarketSource[] = [];
  const output = Array.isArray(responseJson.output) ? responseJson.output : [];

  for (const item of output) {
    if (item?.type === "web_search_call" && Array.isArray(item?.action?.sources)) {
      for (const source of item.action.sources) {
        const url = safeUrl(source?.url);
        if (!url) continue;
        sources.push({ title: "Web research source", url, publisher: "", summary: "" });
      }
    }

    for (const content of Array.isArray(item?.content) ? item.content : []) {
      for (const annotation of Array.isArray(content?.annotations) ? content.annotations : []) {
        if (annotation?.type !== "url_citation") continue;
        const url = safeUrl(annotation.url);
        if (!url) continue;
        sources.push({
          title: text(annotation.title, 500) || "Web research source",
          url,
          publisher: "",
          summary: "",
        });
      }
    }
  }

  return sources;
}

function normalizeReport(raw: any, responseSources: AutomatedMarketSource[]): AutomatedMarketReport {
  const parsedSources = Array.isArray(raw?.sources)
    ? raw.sources.map((source: any) => ({
        title: text(source?.title, 500) || "Web research source",
        url: safeUrl(source?.url),
        publisher: text(source?.publisher, 300),
        summary: text(source?.summary, 1200),
      }))
    : [];
  const sourceMap = new Map<string, AutomatedMarketSource>();

  for (const source of [...parsedSources, ...responseSources]) {
    if (!source.url) continue;
    const key = canonicalUrl(source.url);
    const existing = sourceMap.get(key);
    sourceMap.set(key, {
      title: source.title || existing?.title || "Web research source",
      url: source.url,
      publisher: source.publisher || existing?.publisher || "",
      summary: source.summary || existing?.summary || "",
    });
  }

  return {
    version: "1.0",
    reportTitle: text(raw?.reportTitle, 500) || "Automated market-position report",
    executiveSummary: text(raw?.executiveSummary),
    marketPosition: text(raw?.marketPosition),
    competitors: (Array.isArray(raw?.competitors) ? raw.competitors : [])
      .map((competitor: any) => ({
        name: text(competitor?.name, 300),
        websiteUrl: safeUrl(competitor?.websiteUrl),
        positioning: text(competitor?.positioning, 1800),
        strengths: list(competitor?.strengths),
        weaknesses: list(competitor?.weaknesses),
        notableOffers: list(competitor?.notableOffers),
        sourceUrls: list(competitor?.sourceUrls, 10).map(safeUrl).filter(Boolean),
      }))
      .filter((competitor: AutomatedCompetitorAnalysis) => competitor.name),
    gaps: (Array.isArray(raw?.gaps) ? raw.gaps : [])
      .map((gap: any) => ({
        title: text(gap?.title, 400),
        category: [
          "messaging",
          "service",
          "offer",
          "content",
          "search",
          "proof",
          "audience",
          "geography",
        ].includes(gap?.category)
          ? gap.category
          : "messaging",
        description: text(gap?.description, 1800),
        whyFillable: text(gap?.whyFillable, 1800),
        recommendedAction: text(gap?.recommendedAction, 1800),
        confidenceScore: score(gap?.confidenceScore),
        sourceUrls: list(gap?.sourceUrls, 10).map(safeUrl).filter(Boolean),
      }))
      .filter((gap: AutomatedMarketGap) => gap.title && gap.description),
    searchDemand: (Array.isArray(raw?.searchDemand) ? raw.searchDemand : [])
      .map((item: any) => ({
        topic: text(item?.topic, 400),
        intent: text(item?.intent, 800),
        opportunity: text(item?.opportunity, 1800),
        confidenceScore: score(item?.confidenceScore),
        sourceUrls: list(item?.sourceUrls, 10).map(safeUrl).filter(Boolean),
      }))
      .filter((item: AutomatedSearchDemand) => item.topic && item.opportunity),
    risks: (Array.isArray(raw?.risks) ? raw.risks : [])
      .map((risk: any) => ({
        title: text(risk?.title, 400),
        description: text(risk?.description, 1800),
        mitigation: text(risk?.mitigation, 1800),
        confidenceScore: score(risk?.confidenceScore),
        sourceUrls: list(risk?.sourceUrls, 10).map(safeUrl).filter(Boolean),
      }))
      .filter((risk: AutomatedMarketRisk) => risk.title && risk.description),
    sources: Array.from(sourceMap.values()).slice(0, 30),
  };
}

function buildResearchPrompt({
  foundation,
  objective,
  geography,
  knownCompetitors,
}: {
  foundation: StrategyFoundation;
  objective: string;
  geography: string;
  knownCompetitors: string;
}) {
  const services = foundation.market.serviceLines.map((item) => item.name).join(", ");
  const offers = foundation.market.offers.map((item) => item.name).join(", ");
  const audiences = foundation.market.audiences.map((item) => item.name).join(", ");

  return [
    "Conduct a live web-research study for the active customer account.",
    "Inspect the customer website first when a URL is available, then discover and inspect 3-7 direct competitors serving the same audience, service category, and geography.",
    "Compare market positioning, services, offers, proof, calls to action, audience focus, content themes, and observable search-demand signals.",
    "Identify practical gaps the customer could credibly fill within 3-12 months. Do not recommend capabilities the account does not currently possess unless clearly labeled as an expansion opportunity.",
    "Separate observed facts from inference. Prefer first-party company websites and authoritative directories or publications. Do not invent prices, rankings, traffic, market share, or customer sentiment.",
    "Every competitor, gap, search-demand item, and risk must include the URLs supporting it.",
    "Return concise, executive-friendly reporting rather than raw research notes.",
    "",
    `Account: ${foundation.accountName}`,
    `Customer website: ${foundation.businessTruth.websiteUrl || "Not provided"}`,
    `Geography: ${geography || foundation.businessTruth.serviceAreas.join(", ") || "Use the account's likely served market"}`,
    `Services: ${services || "Not yet structured"}`,
    `Offers: ${offers || "Not yet structured"}`,
    `Audiences: ${audiences || foundation.evidence.audienceSummary || "Not yet structured"}`,
    `Known positioning: ${foundation.campaignDefaults.differentiator || foundation.evidence.businessSummary || "Not yet structured"}`,
    `Known competitors supplied by user: ${knownCompetitors || "None; discover them"}`,
    `Research objective: ${objective || "Determine competitive position, unmet demand, and realistic market gaps the account can fill."}`,
  ].join("\n");
}

export async function runAutomatedMarketResearch({
  foundation,
  objective,
  geography,
  knownCompetitors,
}: {
  foundation: StrategyFoundation;
  objective: string;
  geography: string;
  knownCompetitors: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it in Vercel Environment Variables and redeploy.");
  }

  const model = process.env.MARKET_INTELLIGENCE_MODEL || "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      max_tool_calls: 12,
      input: [
        {
          role: "system",
          content:
            "You are Marketing VIP's market-intelligence analyst. Use live web research, cite evidence, distinguish fact from inference, and identify commercially realistic gaps for the active customer account.",
        },
        {
          role: "user",
          content: buildResearchPrompt({ foundation, objective, geography, knownCompetitors }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "automated_market_position_report",
          strict: true,
          schema: AUTOMATED_MARKET_REPORT_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI web research failed: ${response.status} ${response.statusText} — ${errorText}`,
    );
  }

  const responseJson = await response.json();
  const outputText = extractOutputText(responseJson);
  if (!outputText) throw new Error("OpenAI web research returned no report text.");

  const rawReport = JSON.parse(outputText);
  const report = normalizeReport(rawReport, extractResponseSources(responseJson));

  if (!report.competitors.length && !report.gaps.length) {
    throw new Error("Web research did not produce competitors or market gaps.");
  }

  return {
    report,
    model,
    responseId: text(responseJson.id, 300),
  };
}
