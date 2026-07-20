import type {
  GalaxyAiCatalogNode,
  GalaxyAiRunDetails,
  GalaxyAiWorkflow,
  GalaxyAiWorkflowMediaResponse,
} from "./types";

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

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = jsonRecord(value);

  for (const key of ["items", "data", "nodes", "models", "workflows"]) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function galaxyAiRequestWithCandidates<T>(
  attempts: Array<{ path: string; options?: RequestInit; label?: string }>,
  parser: (value: unknown) => T,
) {
  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const value = await galaxyAiRequest<unknown>(attempt.path, attempt.options);
      return {
        value: parser(value),
        path: attempt.path,
        raw: value,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown GalaxyAI error";
      errors.push(`${attempt.label ?? attempt.path}: ${message}`);
    }
  }

  throw new Error(errors.join(" | "));
}

function normalizeCatalogNode(value: unknown): GalaxyAiCatalogNode | null {
  const record = jsonRecord(value);
  const id = stringValue(record.id ?? record.nodeId ?? record.modelId ?? record.slug);
  const name = stringValue(record.name ?? record.title ?? record.label);
  const type = stringValue(record.type ?? record.nodeType ?? record.modelType);
  const slug = stringValue(record.slug ?? record.handle ?? record.key);

  if (!id && !name && !type && !slug) {
    return null;
  }

  return {
    id,
    name,
    type,
    slug,
    description: stringValue(record.description ?? record.summary),
    category: stringValue(record.category ?? record.family),
    metadata: record,
  };
}

function parseWorkflowId(value: unknown) {
  const record = jsonRecord(value);
  const workflowRecord = jsonRecord(record.workflow);

  return (
    stringValue(record.id) ??
    stringValue(record.workflowId) ??
    stringValue(record.workflow_id) ??
    stringValue(workflowRecord.id) ??
    stringValue(workflowRecord.workflowId) ??
    stringValue(workflowRecord.workflow_id)
  );
}

export async function listGalaxyAiWorkflows() {
  return galaxyAiRequest<GalaxyAiWorkflow[]>("/v1/workflows");
}

export async function getGalaxyAiRun(runId: string) {
  return galaxyAiRequest<GalaxyAiRunDetails>(`/v1/runs/${runId}?inDetails=true`);
}

export async function getGalaxyAiWorkflowMedia(workflowId: string) {
  return galaxyAiRequest<GalaxyAiWorkflowMediaResponse>(
    `/v1/workflows/${workflowId}/media`
  );
}

export async function listGalaxyAiNodeCatalog() {
  const result = await galaxyAiRequestWithCandidates<GalaxyAiCatalogNode[]>(
    [
      { path: "/v1/nodes", label: "list nodes" },
      { path: "/v1/models", label: "list models" },
      { path: "/v1/catalog/nodes", label: "list catalog nodes" },
    ],
    (value) => firstArray(value).map(normalizeCatalogNode).filter(Boolean) as GalaxyAiCatalogNode[],
  );

  return result.value;
}

export async function createGalaxyAiWorkflowWithFallback(input: {
  name: string;
  description: string;
  payload: Record<string, unknown>;
}) {
  const bodyVariants = [
    input.payload,
    { workflow: input.payload },
    {
      name: input.name,
      description: input.description,
      spec: input.payload,
    },
    {
      name: input.name,
      description: input.description,
      template: input.payload,
    },
  ];

  const attempts = [
    "/v1/workflows",
    "/v1/workflows/create",
    "/v1/workflows/quick-create",
  ].flatMap((path) =>
    bodyVariants.map((body, index) => ({
      path,
      label: `${path} variant ${index + 1}`,
      options: {
        method: "POST",
        body: JSON.stringify(body),
      },
    }))
  );

  const result = await galaxyAiRequestWithCandidates<{ workflowId: string; raw: Record<string, unknown> }>(
    attempts,
    (value) => {
      const workflowId = parseWorkflowId(value);

      if (!workflowId) {
        throw new Error("GalaxyAI did not return a workflow id.");
      }

      return {
        workflowId,
        raw: jsonRecord(value),
      };
    },
  );

  return result.value;
}

export type GalaxyAiRunValues = Record<string, Record<string, unknown>>;

export type StartGalaxyAiRunInput = {
  workflowId: string;
  values: GalaxyAiRunValues;
};

export async function startGalaxyAiWorkflowRun(input: StartGalaxyAiRunInput) {
  return galaxyAiRequest<{ runId: string }>("/v1/runs", {
    method: "POST",
    body: JSON.stringify({
      workflowId: input.workflowId,
      values: input.values,
    }),
  });
}
