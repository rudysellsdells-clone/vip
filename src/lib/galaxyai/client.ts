import type {
  GalaxyAiCatalogNode,
  GalaxyAiCatalogSubModel,
  GalaxyAiModelSchemaField,
  GalaxyAiRunDetails,
  GalaxyAiWorkflow,
  GalaxyAiWorkflowMediaResponse,
} from "./types";

const GALAXYAI_BASE_URL =
  process.env.MAGICA_API_BASE_URL ||
  process.env.GALAXYAI_API_BASE_URL ||
  "https://api.magica.com/api";

function getGalaxyAiApiKey() {
  const apiKey = process.env.MAGICA_API_KEY || process.env.GALAXYAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing MAGICA_API_KEY or GALAXYAI_API_KEY environment variable.");
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

  if (response.status === 204) {
    return {} as T;
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

  for (const key of [
    "items",
    "data",
    "nodes",
    "models",
    "workflows",
    "results",
  ]) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

function normalizeCatalogSubModel(value: unknown): GalaxyAiCatalogSubModel | null {
  const record = jsonRecord(value);
  const subModelId = stringValue(
    record.subModelId ?? record.id ?? record.modelId ?? record.slug,
  );
  const name = stringValue(record.name ?? record.title ?? record.label);

  if (!subModelId && !name) {
    return null;
  }

  return {
    subModelId,
    name,
    category: stringValue(record.category ?? record.type ?? record.mode),
    metadata: record,
  };
}

function normalizeCatalogNode(value: unknown): GalaxyAiCatalogNode | null {
  const record = jsonRecord(value);
  const id = stringValue(record.id ?? record.nodeId ?? record.modelId ?? record.slug);
  const name = stringValue(record.name ?? record.title ?? record.label);
  const type = stringValue(record.type ?? record.nodeType ?? record.modelType);
  const slug = stringValue(record.slug ?? record.handle ?? record.key);
  const subModels = firstArray(record.subModels)
    .map(normalizeCatalogSubModel)
    .filter(Boolean) as GalaxyAiCatalogSubModel[];

  if (!id && !name && !type && !slug && !subModels.length) {
    return null;
  }

  return {
    id,
    name,
    type,
    slug,
    description: stringValue(record.description ?? record.summary),
    category: stringValue(record.category ?? record.family),
    subModels,
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

function parseWorkflow(value: unknown): GalaxyAiWorkflow {
  const record = jsonRecord(value);
  const nestedWorkflow = jsonRecord(record.workflow);
  const workflowRecord = Object.keys(nestedWorkflow).length ? nestedWorkflow : record;

  const id = parseWorkflowId(value);
  if (!id) {
    throw new Error("GalaxyAI did not return a workflow id.");
  }

  const nodes = firstArray(workflowRecord.nodes);
  const edges = firstArray(workflowRecord.edges);

  return {
    ...record,
    ...workflowRecord,
    id,
    name:
      stringValue(workflowRecord.name ?? workflowRecord.title ?? record.name ?? record.title) ??
      "Untitled GalaxyAI Workflow",
    description: stringValue(
      workflowRecord.description ?? workflowRecord.summary ?? record.description ?? record.summary,
    ),
    nodes,
    edges,
  };
}

function parseSchemaField(value: unknown): GalaxyAiModelSchemaField | null {
  const record = jsonRecord(value);
  const key = stringValue(record.key ?? record.name ?? record.id ?? record.fieldKey);

  if (!key) {
    return null;
  }

  const options = firstArray(record.options)
    .map((option) => {
      const optionRecord = jsonRecord(option);
      const optionValue = stringValue(optionRecord.value ?? optionRecord.id ?? optionRecord.key);
      const optionLabel = stringValue(optionRecord.label ?? optionRecord.name ?? optionValue);
      if (!optionValue || !optionLabel) {
        return null;
      }
      return {
        label: optionLabel,
        value: optionValue,
      };
    })
    .filter(Boolean) as Array<{ label: string; value: string }>;

  return {
    key,
    label: stringValue(record.label ?? record.name ?? key) ?? key,
    type: stringValue(record.type ?? record.inputType ?? record.fieldType),
    required: Boolean(record.required),
    defaultValue: record.defaultValue ?? record.default ?? record.value,
    options,
    metadata: record,
  };
}

function parseSchema(value: unknown): GalaxyAiModelSchemaField[] {
  const record = jsonRecord(value);
  const directFields = firstArray(
    record.fields ?? record.inputs ?? record.schema ?? record.parameters,
  );

  if (directFields.length) {
    return directFields.map(parseSchemaField).filter(Boolean) as GalaxyAiModelSchemaField[];
  }

  const inputsRecord = jsonRecord(record.inputs);
  if (Object.keys(inputsRecord).length) {
    return Object.entries(inputsRecord)
      .map(([key, raw]) => {
        const field = parseSchemaField({ key, ...(jsonRecord(raw)) });
        return field;
      })
      .filter(Boolean) as GalaxyAiModelSchemaField[];
  }

  return [];
}

function parseNodeResponse(value: unknown) {
  const record = jsonRecord(value);
  const nestedNode = jsonRecord(record.node);
  const nodeRecord = Object.keys(nestedNode).length ? nestedNode : record;

  const nodeId = stringValue(nodeRecord.id ?? nodeRecord.nodeId ?? record.nodeId);
  if (!nodeId) {
    throw new Error("GalaxyAI did not return a node id.");
  }

  const inputPorts = firstArray(
    nodeRecord.inputPorts ?? nodeRecord.inputs ?? record.inputPorts ?? record.inputs,
  );
  const outputPorts = firstArray(
    nodeRecord.outputPorts ?? nodeRecord.outputs ?? record.outputPorts ?? record.outputs,
  );

  return {
    id: nodeId,
    type: stringValue(nodeRecord.type ?? nodeRecord.nodeType ?? record.type ?? record.nodeType),
    inputPorts,
    outputPorts,
    raw: {
      ...record,
      ...nodeRecord,
      inputPorts,
      outputPorts,
    },
  };
}

export async function listGalaxyAiWorkflows() {
  const result = await galaxyAiRequestWithCandidates<GalaxyAiWorkflow[]>(
    [{ path: "/v1/workflows", label: "list workflows" }],
    (value) => firstArray(value).map(parseWorkflow),
  );

  return result.value;
}

export async function getGalaxyAiWorkflow(workflowId: string) {
  const result = await galaxyAiRequestWithCandidates<GalaxyAiWorkflow>(
    [{ path: `/v1/workflows/${workflowId}`, label: "get workflow" }],
    (value) => parseWorkflow(value),
  );

  return result.value;
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
      { path: "/v1/models", label: "list models" },
      { path: "/v1/nodes", label: "list nodes" },
      { path: "/v1/catalog/nodes", label: "list catalog nodes" },
    ],
    (value) => firstArray(value).map(normalizeCatalogNode).filter(Boolean) as GalaxyAiCatalogNode[],
  );

  return result.value;
}

export async function getGalaxyAiModelSchema(modelId: string) {
  const result = await galaxyAiRequestWithCandidates<GalaxyAiModelSchemaField[]>(
    [
      { path: `/v1/models/${modelId}/schema`, label: "model schema" },
      { path: `/v1/models/${modelId}`, label: "model details fallback" },
    ],
    (value) => parseSchema(value),
  );

  return result.value;
}

export async function quickCreateGalaxyAiWorkflow(input: {
  name: string;
  description: string;
  requestFields: Array<{ name: string; type: string; value?: string }>;
}) {
  const result = await galaxyAiRequestWithCandidates<GalaxyAiWorkflow>(
    [
      {
        path: "/v1/workflows/quick-create",
        label: "quick-create workflow",
        options: {
          method: "POST",
          body: JSON.stringify(input),
        },
      },
    ],
    (value) => parseWorkflow(value),
  );

  return result.value;
}

export async function addGalaxyAiWorkflowNode(input: {
  workflowId: string;
  nodeType: string;
  mode?: string | null;
  column?: number;
  row?: number;
  inputs?: Record<string, unknown>;
}) {
  const payload = {
    nodeType: input.nodeType,
    ...(input.mode ? { mode: input.mode } : {}),
    ...(typeof input.column === "number" ? { column: input.column } : {}),
    ...(typeof input.row === "number" ? { row: input.row } : {}),
    ...(input.inputs ? { inputs: input.inputs } : {}),
  };

  const result = await galaxyAiRequestWithCandidates<ReturnType<typeof parseNodeResponse>>(
    [
      {
        path: `/v1/workflows/${input.workflowId}/nodes`,
        label: "add workflow node",
        options: {
          method: "POST",
          body: JSON.stringify(payload),
        },
      },
    ],
    (value) => parseNodeResponse(value),
  );

  return result.value;
}

export async function connectGalaxyAiWorkflowNodes(input: {
  workflowId: string;
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
}) {
  return galaxyAiRequest<unknown>(`/v1/workflows/${input.workflowId}/edges`, {
    method: "POST",
    body: JSON.stringify({
      sourceNodeId: input.sourceNodeId,
      sourceHandle: input.sourceHandle,
      targetNodeId: input.targetNodeId,
      targetHandle: input.targetHandle,
    }),
  });
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

export { jsonRecord, stringValue, numberValue, firstArray };
