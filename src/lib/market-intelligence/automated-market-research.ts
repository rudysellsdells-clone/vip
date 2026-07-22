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

const REPORT_SCHEMA = {
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

function list(value: unknown, maxItems = 10) {
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
  if (typeof responseJson?.output_text === "string") return responseJson.output_text;
  const output = Array.isArray(responseJson?.output) ? responseJson.output : [];
  return output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .filter(
      (content: any) =>
        content?.type === "output_text" && typeof content?.text === "string",
    )
    .map((content: any) => content.text)
    .join("");
}

function extractResponseSources(responseJson: any): AutomatedMarketSource[] {
  const sources: AutomatedMarketSource[] = [];
  const output = Array.isArray(responseJson?.output) ? responseJson.output : [];

  for (const item of output) {
    if (item?.type === "web_search_call" && Array.isArray(item?.action?.sources)) {
      for (const source of item.action.sources) {
        const url = safeUrl(source?.url);
        if (url) {
          sources.push({
            title: text(source?.title, 500) || "Web research source",
            url,
            publisher: text(source?.publisher, 300),
            summary: "",
          });
        }
      }
    }

    for (const content of Array.isArray(item?.content) ? item.content : []) {
      for (const annotation of Array.isArray(content?.annotations)
        ? content.annotations
        : []) {
        if (annotation?.type !== "url_citation") continue;
        const url = safeUrl(annotation?.url);
        if (!url) continue;
        sources.push({
          title: text(annotation?.title, 500) || "Web research source",
          url,
          publisher: "",
          summary: "",
        });
      }
    }
  }

  return sources;
}

function normalizeReport(
  raw: any,
  responseSources: AutomatedMarketSource[],
): AutomatedMarketReport {
  const parsedSources: AutomatedMarketSource[] = Array.isArray(raw?.sources)
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

  const allowedGapCategories = new Set([
    "messaging",
    "service",
    "offer",
    "content",
    "search",
    "proof",
    "audience",
    "geography",
  ]);

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
        strengths: list(competitor?.strengths, 6),
        weaknesses: list(competitor?.weaknesses, 6),
        notableOffers: list(competitor?.notableOffers, 6),
        sourceUrls: list(competitor?.sourceUrls, 8).map(safeUrl).filter(Boolean),
      }))
      .filter((competitor: AutomatedCompetitorAnalysis) => competitor.name)
      .slice(0, 5),
    gaps: (Array.isArray(raw?.gaps) ? raw.gaps : [])
      .map((gap: any) => ({
        title: text(gap?.title, 400),
        category: allowedGapCategories.has(gap?.category)
          ? gap.category
          : "messaging",
        description: text(gap?.description, 1800),
        whyFillable: text(gap?.whyFillable, 1800),
        recommendedAction: text(gap?.recommendedAction, 1800),
        confidenceScore: score(gap?.confidenceScore),
        sourceUrls: list(gap?.sourceUrls, 8).map(safeUrl).filter(Boolean),
      }))
      .filter((gap: AutomatedMarketGap) => gap.title && gap.description)
      .slice(0, 8),
    searchDemand: (Array.isArray(raw?.searchDemand) ? raw.searchDemand : [])
      .map((item: any) => ({
        topic: text(item?.topic, 400),
        intent: text(item?.intent, 800),
        opportunity: text(item?.opportunity, 1800),
        confidenceScore: score(item?.confidenceScore),
        sourceUrls: list(item?.sourceUrls, 8).map(safeUrl).filter(Boolean),
      }))
      .filter((item: AutomatedSearchDemand) => item.topic && item.opportunity)
      .slice(0, 6),
    risks: (Array.isArray(raw?.risks) ? raw.risks : [])
      .map((risk: any) => ({
        title: text(risk?.title, 400),
        description: text(risk?.description, 1800),
        mitigation: text(risk?.mitigation, 1800),
        confidenceScore: score(risk?.confidenceScore),
        sourceUrls: list(risk?.sourceUrls, 8).map(safeUrl).filter(Boolean),
      }))
      .filter((risk: AutomatedMarketRisk) => risk.title && risk.description)
      .slice(0, 4),
    sources: Array.from(sourceMap.values()).slice(0, 20),
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
    "Run a concise live web study for this customer account.",
    "Inspect the customer website when provided and identify 3-5 direct competitors in the same service category and geography.",
    "Compare positioning, services, offers, proof, calls to action, audience focus, and visible content/search themes.",
    "Return 4-8 realistic gaps the customer could fill within 3-12 months, 3-6 search-demand opportunities, and 2-4 risks.",
    "Distinguish observed facts from inference. Do not invent prices, rankings, traffic, market share, or sentiment.",
    "Use first-party company websites where possible and include supporting URLs on every competitor, gap, search item, and risk.",
    "Keep the report executive-friendly and concise.",
    "",
    `Account: ${foundation.accountName}`,
    `Customer website: ${foundation.businessTruth.websiteUrl || "Not provided"}`,
    `Geography: ${
      geography ||
      foundation.businessTruth.serviceAreas.join(", ") ||
      "Use the account's likely served market"
    }`,
    `Services: ${services || "Not yet structured"}`,
    `Offers: ${offers || "Not yet structured"}`,
    `Audiences: ${
      audiences || foundation.evidence.audienceSummary || "Not yet structured"
    }`,
    `Known positioning: ${
      foundation.campaignDefaults.differentiator ||
      foundation.evidence.businessSummary ||
      "Not yet structured"
    }`,
    `Known competitors: ${knownCompetitors || "None supplied; discover them"}`,
    `Objective: ${
      objective ||
      "Determine competitive position, unmet demand, and realistic market gaps."
    }`,
  ].join("\n");
}

function parseReportJson(outputText: string) {
  const withoutFence = outputText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(withoutFence);
  } catch (error) {
    throw new Error(
      `OpenAI returned a report that could not be parsed as JSON: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`,
    );
  }
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
    throw new Error(
      "Missing OPENAI_API_KEY. Add it in Vercel Environment Variables and redeploy.",
    );
  }

  const model =
    process.env.MARKET_INTELLIGENCE_MODEL ||
    process.env.OPENAI_RESEARCH_MODEL ||
    "gpt-5-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 270_000);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search", search_context_size: "low" }],
        tool_choice: "auto",
        max_tool_calls: 4,
        max_output_tokens: 6000,
        input: [
          {
            role: "system",
            content:
              "You are Marketing VIP's market-intelligence analyst. Use live web research, cite evidence, distinguish fact from inference, and identify commercially realistic gaps.",
          },
          {
            role: "user",
            content: buildResearchPrompt({
              foundation,
              objective,
              geography,
              knownCompetitors,
            }),
          },
        ],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "automated_market_position_report",
            strict: true,
            schema: REPORT_SCHEMA,
          },
        },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The web scan did not finish within the five-minute research window. Try a narrower geography or add one or two known competitors.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = text(await response.text(), 1800);
    throw new Error(
      `OpenAI web research failed (${response.status}): ${
        errorText || response.statusText || "Unknown OpenAI error"
      }`,
    );
  }

  const responseJson = await response.json();
  if (responseJson?.status === "failed") {
    throw new Error(
      `OpenAI web research failed: ${
        text(responseJson?.error?.message, 1200) || "The response was marked failed."
      }`,
    );
  }
  if (responseJson?.status === "incomplete") {
    throw new Error(
      `OpenAI web research was incomplete: ${
        text(responseJson?.incomplete_details?.reason, 500) ||
        "The model did not finish the report."
      }`,
    );
  }

  const outputText = extractOutputText(responseJson);
  if (!outputText) {
    throw new Error("OpenAI web research returned no report text.");
  }

  const report = normalizeReport(
    parseReportJson(outputText),
    extractResponseSources(responseJson),
  );

  if (!report.competitors.length && !report.gaps.length) {
    throw new Error("Web research did not produce competitors or market gaps.");
  }

  return {
    report,
    model,
    responseId: text(responseJson?.id, 300),
  };
}
