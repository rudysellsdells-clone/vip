import "server-only";

import { createHash } from "node:crypto";
import type { DigitalCloneContext } from "@/lib/clone/context";
import { getMarketIntelligenceWorkspace } from "./get-market-intelligence-workspace";
import { isMarketIntelligenceEnabled } from "./feature";
import type {
  MarketIntelligenceWorkspace,
  MarketResearchFindingType,
} from "./market-intelligence";

type SupabaseLike = {
  from: (table: string) => any;
};

export type ApprovedMarketIntelligenceSnapshot = {
  version: "1.0";
  accountId: string;
  generatedAt: string;
  findings: Array<{
    id: string;
    findingType: MarketResearchFindingType;
    title: string;
    summary: string;
    evidence: string | null;
    geography: string | null;
    confidenceScore: number | null;
    sourceIds: string[];
    approvedAt: string | null;
    updatedAt: string;
  }>;
  sources: Array<{
    id: string;
    title: string;
    sourceType: string;
    sourceUrl: string | null;
    publisher: string | null;
    author: string | null;
    publishedAt: string | null;
    retrievedAt: string;
    summary: string | null;
    credibilityScore: number | null;
  }>;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function compact(value: unknown, maxLength = 1000) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxLength
    ? `${text.slice(0, maxLength).trim()}...`
    : text;
}

export function buildApprovedMarketIntelligenceSnapshot({
  accountId,
  workspace,
  generatedAt = new Date().toISOString(),
}: {
  accountId: string;
  workspace: MarketIntelligenceWorkspace;
  generatedAt?: string;
}): ApprovedMarketIntelligenceSnapshot {
  const findings = workspace.approvedFindings.slice(0, 20).map((finding) => ({
    id: finding.id,
    findingType: finding.findingType,
    title: compact(finding.title, 300),
    summary: compact(finding.summary, 1200),
    evidence: compact(finding.evidence, 1600) || null,
    geography: compact(finding.geography, 300) || null,
    confidenceScore: finding.confidenceScore,
    sourceIds: finding.sourceIds,
    approvedAt: finding.approvedAt,
    updatedAt: finding.updatedAt,
  }));
  const referencedSourceIds = new Set(findings.flatMap((finding) => finding.sourceIds));
  const sources = workspace.sources
    .filter((source) => referencedSourceIds.has(source.id))
    .slice(0, 40)
    .map((source) => ({
      id: source.id,
      title: compact(source.title, 300),
      sourceType: source.sourceType,
      sourceUrl: compact(source.sourceUrl, 1200) || null,
      publisher: compact(source.publisher, 300) || null,
      author: compact(source.author, 300) || null,
      publishedAt: source.publishedAt,
      retrievedAt: source.retrievedAt,
      summary: compact(source.summary, 1000) || null,
      credibilityScore: source.credibilityScore,
    }));

  return {
    version: "1.0",
    accountId,
    generatedAt,
    findings,
    sources,
  };
}

export async function getApprovedMarketIntelligenceSnapshot({
  supabase,
  accountId,
}: {
  supabase: SupabaseLike;
  accountId: string;
}): Promise<ApprovedMarketIntelligenceSnapshot | null> {
  if (!isMarketIntelligenceEnabled()) return null;

  const workspace = await getMarketIntelligenceWorkspace({ supabase, accountId });
  return buildApprovedMarketIntelligenceSnapshot({ accountId, workspace });
}

export function computeApprovedMarketIntelligenceSignature(
  snapshot: ApprovedMarketIntelligenceSnapshot,
) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        stableValue({
          version: snapshot.version,
          accountId: snapshot.accountId,
          findings: snapshot.findings,
          sources: snapshot.sources,
        }),
      ),
    )
    .digest("hex");
}

export function appendApprovedMarketIntelligenceToCloneContext({
  cloneContext,
  snapshot,
}: {
  cloneContext: DigitalCloneContext;
  snapshot: ApprovedMarketIntelligenceSnapshot | null;
}): DigitalCloneContext {
  if (!snapshot?.findings.length) return cloneContext;

  const sourceMap = new Map(snapshot.sources.map((source) => [source.id, source]));
  const findingLines = snapshot.findings.flatMap((finding, index) => {
    const sources = finding.sourceIds
      .map((sourceId) => sourceMap.get(sourceId))
      .filter(Boolean)
      .map((source) =>
        [source?.title, source?.publisher, source?.sourceUrl]
          .filter(Boolean)
          .join(" — "),
      );

    return [
      `${index + 1}. [${finding.findingType.replaceAll("_", " ")}] ${finding.title}`,
      `Summary: ${finding.summary}`,
      finding.evidence ? `Evidence: ${finding.evidence}` : "",
      finding.geography ? `Geography: ${finding.geography}` : "",
      finding.confidenceScore !== null
        ? `Confidence: ${finding.confidenceScore}/100`
        : "",
      sources.length ? `Citations: ${sources.join(" | ")}` : "",
      "",
    ].filter(Boolean);
  });

  return {
    ...cloneContext,
    formattedContext: [
      cloneContext.formattedContext,
      "",
      `## Approved Market Intelligence v${snapshot.version}`,
      "Use these reviewed findings as private planning context. Do not copy research notes or citations into public marketing content unless the campaign explicitly calls for sourced claims.",
      "Draft and rejected findings are intentionally excluded.",
      "",
      ...findingLines,
    ].join("\n"),
  };
}
