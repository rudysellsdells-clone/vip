import type { GalaxyAiRunDetails, GalaxyAiWorkflow } from "./types";

const GALAXYAI_BASE_URL = "https://api.galaxy.ai/api";

function getGalaxyAiApiKey() {
  const apiKey = process.env.GALAXYAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GALAXYAI_API_KEY environment variable.");
  }

  return apiKey;
}

async function galaxyAiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getGalaxyAiApiKey();

  const response = await fetch(`${GALAXYAI_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GalaxyAI request failed: ${response.status} ${response.statusText} — ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

export async function listGalaxyAiWorkflows() {
  return galaxyAiRequest<GalaxyAiWorkflow[]>("/v1/workflows");
}

export async function getGalaxyAiRun(runId: string) {
  return galaxyAiRequest<GalaxyAiRunDetails>(`/v1/runs/${runId}`);
}

export type StartGalaxyAiRunInput = {
  workflowId: string;
  values: Record<string, Record<string, unknown>>;
  webhookUrl?: string;
};

export async function startGalaxyAiWorkflowRun(input: StartGalaxyAiRunInput) {
  const body: Record<string, unknown> = {
    workflowId: input.workflowId,
    values: input.values,
  };

  if (input.webhookUrl) {
    body.webhook = {
      url: input.webhookUrl,
    };
  }

  return galaxyAiRequest<{ runId: string }>("/v1/runs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
