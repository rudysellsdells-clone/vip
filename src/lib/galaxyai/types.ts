export type GalaxyAiCatalogSubModel = {
  subModelId: string | null;
  name: string | null;
  category?: string | null;
  metadata: Record<string, unknown>;
};

export type GalaxyAiCatalogNode = {
  id: string | null;
  name: string | null;
  type: string | null;
  slug: string | null;
  description?: string | null;
  category?: string | null;
  subModels?: GalaxyAiCatalogSubModel[];
  metadata: Record<string, unknown>;
};

export type GalaxyAiModelSchemaField = {
  key: string;
  label: string;
  type: string | null;
  required: boolean;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string }>;
  metadata: Record<string, unknown>;
};

export type GalaxyAiWorkflow = {
  id: string;
  name: string;
  description?: string | null;
  nodes?: unknown[];
  edges?: unknown[];
  [key: string]: unknown;
};

export type GalaxyAiRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type NormalizedGalaxyAiRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type GalaxyAiNodeRun = {
  id: string;
  nodeId: string;
  nodeType: string;
  status: GalaxyAiRunStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  estimatedCredits?: number | null;
  actualCredits?: number | null;
  input?: unknown;
  output?: unknown;
};

export type GalaxyAiRunDetails = {
  id: string;
  workflowId: string;
  workflowName?: string | null;
  status: GalaxyAiRunStatus;
  mode?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string | null;
  error?: string | null;
  estimatedCredits?: number | null;
  actualCredits?: number | null;
  nodeRunCount?: number | null;
  singleNodeId?: string | null;
  nodeRuns?: GalaxyAiNodeRun[];
  [key: string]: unknown;
};

export type GalaxyAiMediaItem = {
  url: string;
  type?: string;
  nodeType?: string | null;
  nodeLabel?: string | null;
  nodeId?: string | null;
  runId?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
};

export type GalaxyAiWorkflowMediaResponse = {
  items: GalaxyAiMediaItem[];
};

export function normalizeGalaxyAiStatus(
  status: unknown
): NormalizedGalaxyAiRunStatus {
  if (typeof status !== "string") {
    return "running";
  }

  const normalized = status.toLowerCase();

  if (
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "completed" ||
    normalized === "failed" ||
    normalized === "canceled"
  ) {
    return normalized;
  }

  return "running";
}
