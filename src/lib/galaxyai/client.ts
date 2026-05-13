import type {
  GalaxyAiRunDetails,
  GalaxyAiWorkflow,
  StartGalaxyAiRunResponse,
} from "./types";

const GALAXYAI_BASE_URL = "https://api.galaxy.ai/api";

function getGalaxyAiApiKey() {
  const apiKey = process.env.GALAXYAI_API_KEY;

  if (!apiKey || apiKey === "not_set_yet") {
    throw new Error("Missing GALAXYAI_API_KEY environment variable.");
  }

  return apiKey;
}

async function galaxyAiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GALAXYAI_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getGalaxyAiApiKey()}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `GalaxyAI request failed: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ""}`
    );
  }

  return response.json() as Promise<T>;
}

function normalizeWorkflowList(response: unknown): GalaxyAiWorkflow[] {
  if (Array.isArray(response)) return response as GalaxyAiWorkflow[];

  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>;

    if (Array.isArray(obj.workflows)) return obj.workflows as GalaxyAiWorkflow[];
    if (Array.isArray(obj.data)) return obj.data as GalaxyAiWorkflow[];
    if (Array.isArray(obj.items)) return obj.items as GalaxyAiWorkflow[];
  }

  return [];
}

export async function listGalaxyAiWorkflows() {
  const response = await galaxyAiRequest<unknown>("/v1/workflows");
  return normalizeWorkflowList(response);
}

export async function getGalaxyAiRun(runId: string) {
  return galaxyAiRequest<GalaxyAiRunDetails>(`/v1/runs/${encodeURIComponent(runId)}`);
}

export async function startGalaxyAiWorkflowRun(input: {
  workflowId: string;
  values?: Record<string, unknown>;
  webhookUrl?: string;
}) {
  return galaxyAiRequest<StartGalaxyAiRunResponse>("/v1/runs", {
    method: "POST",
    body: JSON.stringify({
      workflowId: input.workflowId,
      values: input.values ?? {},
      source: "api",
      ...(input.webhookUrl
        ? {
            webhook: {
              url: input.webhookUrl,
              events: ["run.completed", "run.failed"],
            },
          }
        : {}),
    }),
  });
}
