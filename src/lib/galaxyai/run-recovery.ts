import { extractGalaxyMediaAttachments } from "./media.ts";
import type {
  GalaxyAiMediaItem,
  GalaxyAiRunDetails,
  NormalizedGalaxyAiRunStatus,
} from "./types.ts";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function mediaType(value: unknown): string | undefined {
  const text = clean(value);
  return text || undefined;
}

function normalizeUrl(value: unknown) {
  const text = clean(value);
  if (!text) return "";

  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function mediaFromRunOutputs(
  galaxyRun: GalaxyAiRunDetails,
  galaxyRunId: string,
): GalaxyAiMediaItem[] {
  const output: GalaxyAiMediaItem[] = [];

  for (const nodeRun of galaxyRun.nodeRuns ?? []) {
    const attachments = extractGalaxyMediaAttachments(nodeRun.output);

    for (const attachment of attachments) {
      output.push({
        url: attachment.url,
        type: attachment.type,
        nodeType: clean(nodeRun.nodeType) || null,
        nodeLabel: null,
        nodeId: clean(nodeRun.nodeId) || null,
        runId: galaxyRunId,
        createdAt: clean(nodeRun.finishedAt) || clean(galaxyRun.finishedAt) || null,
      });
    }
  }

  return output;
}

function exactWorkflowMediaForRun(
  items: GalaxyAiMediaItem[],
  galaxyRunId: string,
) {
  return items.filter((item) => clean(item.runId) === galaxyRunId);
}

function dedupeMedia(items: GalaxyAiMediaItem[]) {
  const byUrl = new Map<string, GalaxyAiMediaItem>();

  for (const item of items) {
    const url = normalizeUrl(item.url);
    if (!url) continue;

    const current = byUrl.get(url);
    const normalized: GalaxyAiMediaItem = {
      ...item,
      url,
      type: mediaType(item.type),
    };

    if (!current) {
      byUrl.set(url, normalized);
      continue;
    }

    // Prefer the workflow-media record because it normally contains the most
    // useful node labels and creation timestamps. Fill any missing fields from
    // the run-output fallback rather than creating a duplicate attachment.
    byUrl.set(url, {
      ...normalized,
      ...current,
      nodeType: current.nodeType ?? normalized.nodeType,
      nodeLabel: current.nodeLabel ?? normalized.nodeLabel,
      nodeId: current.nodeId ?? normalized.nodeId,
      runId: current.runId ?? normalized.runId,
      createdAt: current.createdAt ?? normalized.createdAt,
      type: current.type ?? normalized.type,
    });
  }

  return [...byUrl.values()];
}

export function collectGalaxyAiRunMedia({
  galaxyRun,
  galaxyRunId,
  workflowMediaItems = [],
}: {
  galaxyRun: GalaxyAiRunDetails;
  galaxyRunId: string;
  workflowMediaItems?: GalaxyAiMediaItem[];
}) {
  return dedupeMedia([
    ...exactWorkflowMediaForRun(workflowMediaItems, galaxyRunId),
    ...mediaFromRunOutputs(galaxyRun, galaxyRunId),
  ]);
}

export function isTerminalGalaxyAiStatus(
  status: NormalizedGalaxyAiRunStatus,
) {
  return status === "completed" || status === "failed" || status === "canceled";
}
