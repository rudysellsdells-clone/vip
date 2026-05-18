import type { BraveWebResult } from "@/lib/link-builder/brave-search";
import {
  extractDomain,
  normalizeUrl,
  scoreDirectoryOpportunity,
} from "@/lib/link-builder/directory-scoring";

type DiscoveryStatus = "discovered" | "qualified" | "rejected";

export type DiscoveredDirectoryOpportunity = {
  domain: string;
  url: string;
  submit_url: string | null;
  directory_name: string;
  directory_type: string;
  category: string | null;
  discovery_source: string;
  relevance_score: number;
  quality_score: number;
  risk_score: number;
  ai_summary: string;
  submission_requirements: string | null;
  notes: string;
  status: DiscoveryStatus;
};

const DIRECTORY_SIGNALS = [
  "directory",
  "directories",
  "add listing",
  "submit listing",
  "submit site",
  "add business",
  "claim listing",
  "business listing",
  "company profile",
  "agency directory",
  "member directory",
  "vendor directory",
  "resource directory",
  "citation",
  "chamber",
  "association",
  "partners",
  "marketplace",
];

const SUBMIT_SIGNALS = [
  "add",
  "submit",
  "claim",
  "join",
  "list your business",
  "create profile",
  "suggest",
];

const REJECT_SIGNALS = [
  "buy backlinks",
  "link package",
  "pbn",
  "casino",
  "adult",
  "payday",
  "crypto",
  "guest post marketplace",
  "sponsored post marketplace",
  "500 backlinks",
  "cheap backlinks",
];

function normalizeDiscoveryStatus(value: unknown): DiscoveryStatus {
  if (value === "qualified" || value === "rejected" || value === "discovered") {
    return value;
  }

  return "discovered";
}

function textForResult(result: BraveWebResult) {
  return [
    result.title,
    result.url,
    result.description,
    result.profile?.name,
    ...(result.extra_snippets ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term));
}

function inferDirectoryType(text: string) {
  if (text.includes("chamber")) return "local";
  if (text.includes("association") || text.includes("member directory")) return "association";
  if (text.includes("vendor")) return "vendor";
  if (text.includes("partner")) return "partner";
  if (text.includes("resource")) return "resource";
  if (text.includes("citation")) return "citation";
  if (text.includes("local")) return "local";
  if (text.includes("agency")) return "industry";

  return "general";
}

function inferSubmitUrl(result: BraveWebResult) {
  const url = result.url ? normalizeUrl(result.url) : "";
  const haystack = textForResult(result);

  if (!url) return null;

  if (hasAny(haystack, SUBMIT_SIGNALS)) {
    return url;
  }

  return null;
}

export function braveResultToDirectoryOpportunity({
  result,
  query,
}: {
  result: BraveWebResult;
  query: string;
}): DiscoveredDirectoryOpportunity | null {
  if (!result.url) {
    return null;
  }

  const url = normalizeUrl(result.url);
  const domain = extractDomain(url);
  const haystack = textForResult(result);

  if (!domain || !url) {
    return null;
  }

  if (hasAny(haystack, REJECT_SIGNALS)) {
    const score = scoreDirectoryOpportunity({
      domain,
      url,
      directoryName: result.title,
      directoryType: "general",
      notes: `${result.description ?? ""} ${query}`,
    });

    return {
      domain,
      url,
      submit_url: null,
      directory_name: result.title || domain,
      directory_type: "general",
      category: null,
      discovery_source: "brave_search",
      relevance_score: score.relevanceScore,
      quality_score: Math.min(score.qualityScore, 30),
      risk_score: Math.max(score.riskScore, 75),
      ai_summary: "Rejected automatically because the result matched risky backlink/spam signals.",
      submission_requirements: null,
      notes: `Discovered from Brave query: ${query}. Snippet: ${result.description ?? ""}`,
      status: "rejected",
    };
  }

  const looksLikeDirectory = hasAny(haystack, DIRECTORY_SIGNALS);

  if (!looksLikeDirectory) {
    return null;
  }

  const directoryType = inferDirectoryType(haystack);
  const submitUrl = inferSubmitUrl(result);
  const score = scoreDirectoryOpportunity({
    domain,
    url,
    directoryName: result.title,
    directoryType,
    category: null,
    notes: `${result.description ?? ""} ${query}`,
  });

  const status = normalizeDiscoveryStatus(score.recommendedStatus);

  return {
    domain,
    url,
    submit_url: submitUrl,
    directory_name: result.title || domain,
    directory_type: directoryType,
    category: null,
    discovery_source: "brave_search",
    relevance_score: score.relevanceScore,
    quality_score: score.qualityScore,
    risk_score: score.riskScore,
    ai_summary:
      status === "qualified"
        ? "Auto-discovered from Brave Search and appears relevant enough to review."
        : "Auto-discovered from Brave Search. Needs review before submission.",
    submission_requirements: submitUrl
      ? "Possible submission/add-listing page found in search result."
      : "No clear submission page found yet. Review manually.",
    notes: `Discovered from Brave query: ${query}. Snippet: ${result.description ?? ""}`,
    status,
  };
}
