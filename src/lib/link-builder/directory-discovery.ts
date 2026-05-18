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
  "business profile",
  "agency directory",
  "member directory",
  "vendor directory",
  "resource directory",
  "citation",
  "chamber",
  "association",
  "partners",
  "marketplace",
  "listing",
  "listings",
  "profile",
  "profiles",
  "members",
  "find a",
  "find an",
  "top agencies",
  "best agencies",
  "agency marketplace",
  "company directory",
];

const URL_DIRECTORY_SIGNALS = [
  "/directory",
  "/directories",
  "/add-listing",
  "/submit",
  "/submit-site",
  "/add-business",
  "/claim",
  "/businesses",
  "/companies",
  "/agencies",
  "/members",
  "/vendors",
  "/partners",
  "/resources",
  "/profile",
  "/profiles",
  "/listing",
  "/listings",
];

const SUBMIT_SIGNALS = [
  "add",
  "submit",
  "claim",
  "join",
  "list your business",
  "create profile",
  "suggest",
  "add listing",
  "submit listing",
  "submit your",
  "get listed",
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
  "free backlinks generator",
  "automatic backlinks",
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

function queryHasDirectoryIntent(query: string) {
  const normalized = query.toLowerCase();

  return hasAny(normalized, [
    "directory",
    "directories",
    "add listing",
    "submit listing",
    "add business",
    "business listing",
    "agency directory",
    "company directory",
    "citation",
    "chamber",
    "association",
    "get listed",
  ]);
}

function urlHasDirectorySignal(url: string) {
  const normalized = url.toLowerCase();

  return URL_DIRECTORY_SIGNALS.some((signal) => normalized.includes(signal));
}

function inferDirectoryType(text: string) {
  if (text.includes("chamber")) return "local";
  if (text.includes("association") || text.includes("member directory")) return "association";
  if (text.includes("vendor")) return "vendor";
  if (text.includes("partner")) return "partner";
  if (text.includes("resource")) return "resource";
  if (text.includes("citation")) return "citation";
  if (text.includes("local")) return "local";
  if (text.includes("agency") || text.includes("marketing") || text.includes("seo")) return "industry";

  return "general";
}

function inferSubmitUrl(result: BraveWebResult) {
  const url = result.url ? normalizeUrl(result.url) : "";
  const haystack = textForResult(result);

  if (!url) return null;

  if (hasAny(haystack, SUBMIT_SIGNALS) || urlHasDirectorySignal(url)) {
    return url;
  }

  return null;
}

function shouldTreatAsCandidate({
  haystack,
  url,
  query,
}: {
  haystack: string;
  url: string;
  query: string;
}) {
  if (hasAny(haystack, DIRECTORY_SIGNALS)) {
    return true;
  }

  if (urlHasDirectorySignal(url)) {
    return true;
  }

  // Brave often returns useful pages with vague snippets. If Rudy searched with
  // clear directory/submission intent, keep the result as a lower-confidence
  // "discovered" item instead of dropping it completely.
  if (queryHasDirectoryIntent(query)) {
    return true;
  }

  return false;
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
      relevance_score: Math.min(score.relevanceScore, 25),
      quality_score: Math.min(score.qualityScore, 25),
      risk_score: Math.max(score.riskScore, 75),
      ai_summary: "Rejected automatically because the result matched risky backlink/spam signals.",
      submission_requirements: null,
      notes: `Discovered from Brave query: ${query}. Snippet: ${result.description ?? ""}`,
      status: "rejected",
    };
  }

  if (!shouldTreatAsCandidate({ haystack, url, query })) {
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

  const hasStrongDirectorySignal =
    hasAny(haystack, DIRECTORY_SIGNALS) || urlHasDirectorySignal(url);
  const status = hasStrongDirectorySignal
    ? normalizeDiscoveryStatus(score.recommendedStatus)
    : "discovered";

  const relevanceScore = hasStrongDirectorySignal
    ? score.relevanceScore
    : Math.max(35, Math.min(score.relevanceScore, 55));

  const qualityScore = hasStrongDirectorySignal
    ? score.qualityScore
    : Math.max(35, Math.min(score.qualityScore, 55));

  const riskScore = hasStrongDirectorySignal
    ? score.riskScore
    : Math.max(15, score.riskScore);

  return {
    domain,
    url,
    submit_url: submitUrl,
    directory_name: result.title || domain,
    directory_type: directoryType,
    category: null,
    discovery_source: "brave_search",
    relevance_score: relevanceScore,
    quality_score: qualityScore,
    risk_score: riskScore,
    ai_summary:
      status === "qualified"
        ? "Auto-discovered from Brave Search and appears relevant enough to review."
        : hasStrongDirectorySignal
          ? "Auto-discovered from Brave Search. Needs review before submission."
          : "Broad match from a directory-intent search. Review manually before approving.",
    submission_requirements: submitUrl
      ? "Possible submission/add-listing page found in search result."
      : "No clear submission page found yet. Review manually.",
    notes: `Discovered from Brave query: ${query}. Snippet: ${result.description ?? ""}`,
    status,
  };
}
