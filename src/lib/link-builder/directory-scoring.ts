export type DirectoryScoreInput = {
  domain: string;
  url: string;
  directoryName?: string | null;
  directoryType?: string | null;
  category?: string | null;
  notes?: string | null;
};

const GOOD_TERMS = ["directory", "agency", "marketing", "seo", "web", "business", "local", "chamber", "association", "vendor", "partner", "resource", "citation"];
const RISK_TERMS = ["casino", "porn", "payday", "pbn", "link farm", "buy links", "backlinks package", "adult", "gambling"];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countMatches(haystack: string, terms: string[]) {
  return terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

export function extractDomain(value: string) {
  try {
    return new URL(normalizeUrl(value)).hostname.replace(/^www\./, "");
  } catch {
    return value.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

export function scoreDirectoryOpportunity(input: DirectoryScoreInput) {
  const haystack = [input.domain, input.url, input.directoryName, input.directoryType, input.category, input.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const goodMatches = countMatches(haystack, GOOD_TERMS);
  const riskMatches = countMatches(haystack, RISK_TERMS);
  const submitLanguage = ["submit", "add", "listing", "directory", "claim"].some((term) => haystack.includes(term));

  const relevanceScore = clamp(35 + goodMatches * 8 + (submitLanguage ? 10 : 0));
  const qualityScore = clamp(45 + goodMatches * 5 - riskMatches * 15);
  const riskScore = clamp(10 + riskMatches * 25 - goodMatches * 2);

  const recommendedStatus = riskScore >= 45 || qualityScore < 35 ? "rejected" : relevanceScore >= 55 && qualityScore >= 45 ? "qualified" : "discovered";
  const summary = recommendedStatus === "qualified" ? "Looks relevant enough to review for a legitimate directory submission." : recommendedStatus === "rejected" ? "This looks risky or low-quality. Review carefully before using." : "Needs more review before qualifying.";

  return { relevanceScore, qualityScore, riskScore, recommendedStatus, summary };
}
