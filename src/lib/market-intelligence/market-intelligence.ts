export const MARKET_RESEARCH_PROJECT_STATUSES = [
  "draft",
  "active",
  "complete",
  "archived",
] as const;

export const MARKET_RESEARCH_SOURCE_TYPES = [
  "web",
  "document",
  "interview",
  "analytics",
  "manual",
] as const;

export const MARKET_RESEARCH_FINDING_TYPES = [
  "competitor",
  "search_demand",
  "market_opportunity",
  "audience_insight",
  "trend",
  "risk",
  "proof",
] as const;

export const MARKET_RESEARCH_FINDING_STATUSES = [
  "draft",
  "approved",
  "rejected",
  "archived",
] as const;

export type MarketResearchProjectStatus =
  (typeof MARKET_RESEARCH_PROJECT_STATUSES)[number];
export type MarketResearchSourceType =
  (typeof MARKET_RESEARCH_SOURCE_TYPES)[number];
export type MarketResearchFindingType =
  (typeof MARKET_RESEARCH_FINDING_TYPES)[number];
export type MarketResearchFindingStatus =
  (typeof MARKET_RESEARCH_FINDING_STATUSES)[number];

export type MarketResearchProject = {
  id: string;
  accountId: string;
  title: string;
  objective: string | null;
  industry: string | null;
  geography: string | null;
  status: MarketResearchProjectStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketResearchSource = {
  id: string;
  accountId: string;
  projectId: string | null;
  sourceType: MarketResearchSourceType;
  title: string;
  sourceUrl: string | null;
  publisher: string | null;
  author: string | null;
  publishedAt: string | null;
  retrievedAt: string;
  summary: string | null;
  credibilityScore: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MarketResearchFinding = {
  id: string;
  accountId: string;
  projectId: string | null;
  findingType: MarketResearchFindingType;
  title: string;
  summary: string;
  evidence: string | null;
  geography: string | null;
  confidenceScore: number | null;
  status: MarketResearchFindingStatus;
  sourceIds: string[];
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketIntelligenceWorkspace = {
  projects: MarketResearchProject[];
  sources: MarketResearchSource[];
  findings: MarketResearchFinding[];
  approvedFindings: MarketResearchFinding[];
  counts: {
    activeProjects: number;
    sources: number;
    draftFindings: number;
    approvedFindings: number;
    rejectedFindings: number;
  };
  findingsByType: Record<MarketResearchFindingType, MarketResearchFinding[]>;
};

function cleanString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function requiredString(value: unknown, fallback: string) {
  return cleanString(value) ?? fallback;
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function oneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  const normalized = String(value ?? "").trim();
  return allowed.includes(normalized as T[number])
    ? (normalized as T[number])
    : fallback;
}

export function normalizeMarketResearchProject(
  row: Record<string, unknown>,
): MarketResearchProject {
  return {
    id: requiredString(row.id, "unknown-project"),
    accountId: requiredString(row.account_id, "unknown-account"),
    title: requiredString(row.title, "Untitled research project"),
    objective: cleanString(row.objective),
    industry: cleanString(row.industry),
    geography: cleanString(row.geography),
    status: oneOf(row.status, MARKET_RESEARCH_PROJECT_STATUSES, "draft"),
    startedAt: cleanString(row.started_at),
    completedAt: cleanString(row.completed_at),
    createdAt: requiredString(row.created_at, new Date(0).toISOString()),
    updatedAt: requiredString(row.updated_at, new Date(0).toISOString()),
  };
}

export function normalizeMarketResearchSource(
  row: Record<string, unknown>,
): MarketResearchSource {
  return {
    id: requiredString(row.id, "unknown-source"),
    accountId: requiredString(row.account_id, "unknown-account"),
    projectId: cleanString(row.project_id),
    sourceType: oneOf(row.source_type, MARKET_RESEARCH_SOURCE_TYPES, "web"),
    title: requiredString(row.title, "Untitled source"),
    sourceUrl: cleanString(row.source_url),
    publisher: cleanString(row.publisher),
    author: cleanString(row.author),
    publishedAt: cleanString(row.published_at),
    retrievedAt: requiredString(row.retrieved_at, new Date(0).toISOString()),
    summary: cleanString(row.summary),
    credibilityScore: numberOrNull(row.credibility_score),
    active: row.active !== false,
    createdAt: requiredString(row.created_at, new Date(0).toISOString()),
    updatedAt: requiredString(row.updated_at, new Date(0).toISOString()),
  };
}

export function normalizeMarketResearchFinding(
  row: Record<string, unknown>,
): MarketResearchFinding {
  return {
    id: requiredString(row.id, "unknown-finding"),
    accountId: requiredString(row.account_id, "unknown-account"),
    projectId: cleanString(row.project_id),
    findingType: oneOf(
      row.finding_type,
      MARKET_RESEARCH_FINDING_TYPES,
      "market_opportunity",
    ),
    title: requiredString(row.title, "Untitled finding"),
    summary: requiredString(row.summary, "No summary provided."),
    evidence: cleanString(row.evidence),
    geography: cleanString(row.geography),
    confidenceScore: numberOrNull(row.confidence_score),
    status: oneOf(row.status, MARKET_RESEARCH_FINDING_STATUSES, "draft"),
    sourceIds: stringArray(row.source_ids),
    approvedAt: cleanString(row.approved_at),
    rejectedAt: cleanString(row.rejected_at),
    createdAt: requiredString(row.created_at, new Date(0).toISOString()),
    updatedAt: requiredString(row.updated_at, new Date(0).toISOString()),
  };
}

export function buildMarketIntelligenceWorkspace({
  projects,
  sources,
  findings,
}: {
  projects: MarketResearchProject[];
  sources: MarketResearchSource[];
  findings: MarketResearchFinding[];
}): MarketIntelligenceWorkspace {
  const approvedFindings = findings.filter((finding) => finding.status === "approved");
  const findingsByType = Object.fromEntries(
    MARKET_RESEARCH_FINDING_TYPES.map((type) => [
      type,
      findings.filter((finding) => finding.findingType === type),
    ]),
  ) as Record<MarketResearchFindingType, MarketResearchFinding[]>;

  return {
    projects,
    sources: sources.filter((source) => source.active),
    findings,
    approvedFindings,
    counts: {
      activeProjects: projects.filter((project) => project.status === "active").length,
      sources: sources.filter((source) => source.active).length,
      draftFindings: findings.filter((finding) => finding.status === "draft").length,
      approvedFindings: approvedFindings.length,
      rejectedFindings: findings.filter((finding) => finding.status === "rejected").length,
    },
    findingsByType,
  };
}
