export type GalaxyAiWorkflow = {
  id: string;
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  updatedAt?: string | null;
  type?: string | null;
  [key: string]: unknown;
};

export type GalaxyAiRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type GalaxyAiApiRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | string;

export type GalaxyAiRunDetails = {
  id: string;
  workflowId: string;
  workflowName?: string | null;
  status: GalaxyAiApiRunStatus;
  mode?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string | null;
  error?: string | null;
  estimatedCredits?: number | null;
  actualCredits?: number | null;
  nodeRunCount?: number | null;
  nodeRuns?: Array<{
    id: string;
    nodeId?: string | null;
    nodeType?: string | null;
    status?: GalaxyAiApiRunStatus;
    startedAt?: string | null;
    finishedAt?: string | null;
    error?: string | null;
    estimatedCredits?: number | null;
    actualCredits?: number | null;
    input?: unknown;
    output?: unknown;
  }>;
  [key: string]: unknown;
};

export type StartGalaxyAiRunResponse = {
  runId: string;
};

export function normalizeGalaxyAiStatus(status?: string | null): GalaxyAiRunStatus {
  switch ((status ?? "queued").toLowerCase()) {
    case "running":
      return "running";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "canceled":
    case "cancelled":
      return "canceled";
    case "queued":
    default:
      return "queued";
  }
}
