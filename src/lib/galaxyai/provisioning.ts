import {
  addGalaxyAiWorkflowNode,
  connectGalaxyAiWorkflowNodes,
  getGalaxyAiModelSchema,
  getGalaxyAiWorkflow,
  jsonRecord,
  listGalaxyAiNodeCatalog,
  quickCreateGalaxyAiWorkflow,
  stringValue,
} from "@/lib/galaxyai/client";
import type {
  GalaxyAiCatalogNode,
  GalaxyAiCatalogSubModel,
  GalaxyAiModelSchemaField,
  GalaxyAiWorkflow,
} from "@/lib/galaxyai/types";
import type { Json } from "@/types/database.types";
import type {
  VipManagedGalaxyWorkflowKind,
  VipManagedGalaxyWorkflowMetadata,
} from "@/lib/galaxyai/workflow-metadata";
import {
  getVipManagedGalaxyWorkflowMetadata,
  mergeWorkflowMetadataWithVip,
} from "@/lib/galaxyai/workflow-metadata";

export type ProvisionedGalaxyAiWorkflow = {
  workflowId: string;
  name: string;
  description: string;
  kind: VipManagedGalaxyWorkflowKind;
  metadata: Json;
};

export type GalaxyAiProvisioningResult = {
  created: ProvisionedGalaxyAiWorkflow[];
  reused: ProvisionedGalaxyAiWorkflow[];
  diagnostics: string[];
  catalogCount: number;
  imageNode: string | null;
  videoNode: string | null;
};

type ExistingWorkflowRef = {
  workflowId: string;
  metadata: unknown;
};

type CatalogCandidate = {
  modelId: string;
  nodeType: string;
  modelName: string;
  schemaId: string;
  executionMode: string;
  modeName: string | null;
  category: string | null;
  score: number;
};

type Port = {
  handle: string;
  label: string;
};

type WorkflowNodeRecord = {
  id: string;
  type: string;
  label: string;
  raw: Record<string, unknown>;
};

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function firstArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = jsonRecord(value);
  for (const key of ["items", "data", "nodes", "edges", "fields", "ports", "inputs", "outputs"]) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

function recommendedAssetTypes(kind: VipManagedGalaxyWorkflowKind) {
  return kind === "vip_social_image_only"
    ? ["galaxyai_image_prompt"]
    : ["galaxyai_prompt"];
}

function displayKind(kind: VipManagedGalaxyWorkflowKind) {
  return kind === "vip_social_image_only"
    ? "VIP social image"
    : "VIP social image + video";
}

function workflowName(kind: VipManagedGalaxyWorkflowKind) {
  return kind === "vip_social_image_only"
    ? "Marketing VIP Social Image"
    : "Marketing VIP Social Image + Video";
}

function workflowDescription(kind: VipManagedGalaxyWorkflowKind) {
  return kind === "vip_social_image_only"
    ? "Creates a polished social-media-ready image from an approved Marketing VIP prompt."
    : "Creates a polished social image and a short derived video from an approved Marketing VIP prompt.";
}

function subModelCandidates(node: GalaxyAiCatalogNode) {
  const subModels = Array.isArray(node.subModels) ? node.subModels : [];

  if (subModels.length) {
    return subModels.map((subModel) => ({
      ...subModel,
      parentNode: node,
    }));
  }

  return [
    {
      subModelId: null,
      name: null,
      category: node.category ?? node.type ?? null,
      metadata: {},
      parentNode: node,
    },
  ];
}

function normalizedMode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function requiredExecutionMode(kind: "image" | "video") {
  return kind === "image" ? "text-to-image" : "image-to-video";
}

function resolveExecutionMode(input: {
  node: GalaxyAiCatalogNode;
  subModel: GalaxyAiCatalogSubModel | {
    subModelId: string | null;
    name: string | null;
    category?: string | null;
    metadata: Record<string, unknown>;
  };
  kind: "image" | "video";
}) {
  const required = requiredExecutionMode(input.kind);
  const candidates = [
    input.subModel.category,
    input.subModel.metadata.mode,
    input.subModel.metadata.category,
    input.node.metadata.mode,
    input.node.category,
  ].map(normalizedMode).filter(Boolean);

  return candidates.find((candidate) => candidate === required) ?? null;
}

function scoreCandidate(input: {
  node: GalaxyAiCatalogNode;
  subModel: GalaxyAiCatalogSubModel | { subModelId: string | null; name: string | null; category?: string | null; metadata: Record<string, unknown> };
  kind: "image" | "video";
}) {
  const terms = [
    input.node.id,
    input.node.name,
    input.node.type,
    input.node.slug,
    input.node.category,
    input.node.description,
    input.subModel.subModelId,
    input.subModel.name,
    input.subModel.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  if (input.kind === "image") {
    if (terms.includes("text-to-image")) score += 30;
    if (terms.includes("image generation")) score += 16;
    if (terms.includes("image")) score += 8;
    if (terms.includes("flux")) score += 10;
    if (terms.includes("gpt image")) score += 12;
    if (terms.includes("image-to-video")) score -= 25;
    if (terms.includes("video")) score -= 18;
  } else {
    if (terms.includes("image-to-video")) score += 30;
    if (terms.includes("video generation")) score += 16;
    if (terms.includes("video")) score += 8;
    if (terms.includes("seedance")) score += 12;
    if (terms.includes("text-to-image")) score -= 25;
  }

  if (input.subModel.subModelId) {
    score += 2;
  }

  return score;
}

function pickBestCatalogCandidate(
  nodes: GalaxyAiCatalogNode[],
  kind: "image" | "video",
) {
  const candidates: CatalogCandidate[] = [];

  for (const node of nodes) {
    for (const subModel of subModelCandidates(node)) {
      const score = scoreCandidate({ node, subModel, kind });
      if (score <= 0) continue;

      const nodeType = stringValue(node.type ?? node.id ?? node.slug);
      const modelId = stringValue(node.id ?? node.slug ?? node.type);
      if (!nodeType || !modelId) continue;

      const executionMode = resolveExecutionMode({ node, subModel, kind });
      if (!executionMode) continue;

      candidates.push({
        modelId,
        nodeType,
        modelName: stringValue(node.name) ?? nodeType,
        schemaId: stringValue(subModel.subModelId) ?? modelId,
        executionMode,
        modeName: stringValue(subModel.name),
        category: stringValue(subModel.category ?? node.category),
        score,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

function findField(fields: GalaxyAiModelSchemaField[], aliases: string[]) {
  const lowered = aliases.map((alias) => alias.toLowerCase());

  return (
    fields.find((field) => lowered.includes(field.key.toLowerCase())) ??
    fields.find((field) => lowered.some((alias) => field.label.toLowerCase().includes(alias))) ??
    null
  );
}

function pickOption(field: GalaxyAiModelSchemaField | null, preferredValues: string[]) {
  if (!field?.options?.length) {
    return null;
  }

  const lowered = preferredValues.map((value) => value.toLowerCase());

  const exact = field.options.find((option) => lowered.includes(option.value.toLowerCase()));
  if (exact) {
    return exact.value;
  }

  const fuzzy = field.options.find((option) =>
    lowered.some((value) => option.value.toLowerCase().includes(value) || option.label.toLowerCase().includes(value)),
  );
  if (fuzzy) {
    return fuzzy.value;
  }

  return field.options[0]?.value ?? null;
}

function buildImageNodeInputs(fields: GalaxyAiModelSchemaField[]) {
  const inputs: Record<string, unknown> = {};

  const countField = findField(fields, ["count", "num_images", "n"]);
  if (countField) {
    inputs[countField.key] = 1;
  }

  const aspectField = findField(fields, ["aspectratio", "aspect_ratio", "imagesize", "image_size", "ratio"]);
  if (aspectField) {
    const picked = pickOption(aspectField, ["4:5", "3:4", "portrait"]);
    if (picked) inputs[aspectField.key] = picked;
  }

  const qualityField = findField(fields, ["quality"]);
  if (qualityField) {
    const picked = pickOption(qualityField, ["high", "best", "standard"]);
    if (picked) inputs[qualityField.key] = picked;
  }

  const styleField = findField(fields, ["style", "prompt_style"]);
  if (styleField) {
    const picked = pickOption(styleField, ["photorealistic", "realistic", "natural"]);
    if (picked) inputs[styleField.key] = picked;
  }

  const formatField = findField(fields, ["format", "outputformat", "output_format"]);
  if (formatField) {
    const picked = pickOption(formatField, ["jpeg", "jpg", "png"]);
    if (picked) inputs[formatField.key] = picked;
  }

  return inputs;
}

function buildVideoNodeInputs(fields: GalaxyAiModelSchemaField[]) {
  const inputs: Record<string, unknown> = {};

  const durationField = findField(fields, ["duration", "durationseconds", "duration_seconds"]);
  if (durationField) {
    const picked = pickOption(durationField, ["15", "15s", "15 seconds"]);
    inputs[durationField.key] = picked ?? 15;
  }

  const resolutionField = findField(fields, ["resolution", "size"]);
  if (resolutionField) {
    const picked = pickOption(resolutionField, ["720p", "hd"]);
    if (picked) inputs[resolutionField.key] = picked;
  }

  const aspectField = findField(fields, ["aspectratio", "aspect_ratio", "ratio"]);
  if (aspectField) {
    const picked = pickOption(aspectField, ["4:5", "3:4", "portrait"]);
    if (picked) inputs[aspectField.key] = picked;
  }

  return inputs;
}

function parseWorkflowNodes(workflow: GalaxyAiWorkflow) {
  return firstArray(workflow.nodes).map((node) => {
    const raw = jsonRecord(node);
    const id = stringValue(raw.id ?? raw.nodeId) ?? "";
    const type = stringValue(raw.type ?? raw.nodeType ?? raw.kind) ?? "";
    const label = stringValue(raw.name ?? raw.title ?? raw.label) ?? type;
    return { id, type, label, raw } satisfies WorkflowNodeRecord;
  }).filter((node) => node.id);
}

function nodeHaystack(node: WorkflowNodeRecord) {
  return [node.id, node.type, node.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function findScaffoldNode(workflow: GalaxyAiWorkflow, kind: "request" | "response") {
  const nodes = parseWorkflowNodes(workflow);
  const preferred = nodes.find((node) => nodeHaystack(node).includes(kind));
  if (preferred) return preferred;

  if (kind === "request") {
    return nodes.find((node) => firstArray(node.raw.fields ?? jsonRecord(node.raw.data).fields).length > 0) ?? null;
  }

  return nodes.find((node) => firstArray(node.raw.inputPorts ?? node.raw.inputs).length > 0) ?? null;
}

function parsePorts(value: unknown): Port[] {
  return firstArray(value)
    .map((entry) => {
      if (typeof entry === "string" && entry.trim()) {
        const handle = entry.trim();
        return { handle, label: handle };
      }

      const record = jsonRecord(entry);
      const handle = stringValue(
        record.handle ?? record.key ?? record.id ?? record.name ?? record.fieldId,
      );
      const label = stringValue(
        record.label ?? record.name ?? record.title ?? record.key ?? record.id,
      );
      if (!handle) {
        return null;
      }
      return {
        handle,
        label: label ?? handle,
      };
    })
    .filter(Boolean) as Port[];
}

function findPortHandle(ports: Port[], aliases: string[]) {
  const lowered = aliases.map((alias) => alias.toLowerCase());
  const exact = ports.find((port) => lowered.includes(port.handle.toLowerCase()));
  if (exact) return exact.handle;

  const fuzzy = ports.find((port) => {
    const haystack = `${port.handle} ${port.label}`.toLowerCase();
    return lowered.some((alias) => haystack.includes(alias));
  });
  if (fuzzy) return fuzzy.handle;

  return ports[0]?.handle ?? null;
}

function slugifyFieldName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function collectFieldCandidates(value: unknown, output: Port[], depth = 0) {
  if (depth > 7 || value == null) {
    return;
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (text.startsWith("field_") && !output.some((item) => item.handle === text)) {
      output.push({ handle: text, label: text });
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFieldCandidates(item, output, depth + 1);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  const directHandle = stringValue(
    record.fieldId ?? record.id ?? record.key ?? record.handle,
  );
  const directLabel = stringValue(
    record.name ?? record.label ?? record.title ?? record.fieldName,
  );

  if (directHandle && (directHandle.startsWith("field_") || directLabel)) {
    if (!output.some((item) => item.handle === directHandle)) {
      output.push({
        handle: directHandle,
        label: directLabel ?? directHandle,
      });
    }
  }

  for (const [key, nested] of Object.entries(record)) {
    if (key.startsWith("field_") && !output.some((item) => item.handle === key)) {
      const nestedRecord = jsonRecord(nested);
      output.push({
        handle: key,
        label:
          stringValue(nestedRecord.name ?? nestedRecord.label ?? nestedRecord.title) ?? key,
      });
    }
    collectFieldCandidates(nested, output, depth + 1);
  }
}

function requestFieldHandle(
  scaffold: GalaxyAiWorkflow,
  requestNode: WorkflowNodeRecord,
  requestedFieldName: string,
) {
  const candidates: Port[] = [];
  collectFieldCandidates(scaffold, candidates);
  collectFieldCandidates(requestNode.raw, candidates);

  const requested = requestedFieldName.toLowerCase();
  const requestedSlug = slugifyFieldName(requestedFieldName);
  const exact = candidates.find((candidate) => {
    const handle = candidate.handle.toLowerCase();
    const label = candidate.label.toLowerCase();
    return (
      handle === requested ||
      handle === `field_${requestedSlug}` ||
      label === requested ||
      slugifyFieldName(label) === requestedSlug
    );
  });

  if (exact) {
    return exact.handle;
  }

  const fuzzy = candidates.find((candidate) => {
    const haystack = `${candidate.handle} ${candidate.label}`.toLowerCase();
    return haystack.includes(requested) || haystack.includes(requestedSlug);
  });

  if (fuzzy) {
    return fuzzy.handle;
  }

  // Magica's Request-node field IDs use the bare `field_<slug>` format.
  // The workflow-builder documentation shows examples such as field_cat and
  // field_dog. A prompt field therefore resolves deterministically to
  // field_prompt even when GET /workflows omits the field schema from node.data.
  const slug = slugifyFieldName(requestedFieldName);
  return slug ? `field_${slug}` : null;
}

function nodeInputHandle(nodeRaw: Record<string, unknown>, aliases: string[]) {
  return findPortHandle(parsePorts(nodeRaw.inputPorts ?? nodeRaw.inputs), aliases);
}

function nodeOutputHandle(nodeRaw: Record<string, unknown>, aliases: string[]) {
  return findPortHandle(parsePorts(nodeRaw.outputPorts ?? nodeRaw.outputs), aliases);
}

function responseInputHandle(responseNode: WorkflowNodeRecord) {
  return (
    findPortHandle(
      parsePorts(responseNode.raw.inputPorts ?? responseNode.raw.inputs),
      ["result", "in:result", "output", "media", "image", "video"],
    ) ?? "result"
  );
}

async function verifyManagedWorkflow(input: {
  workflowId: string;
  kind: VipManagedGalaxyWorkflowKind;
  metadata: VipManagedGalaxyWorkflowMetadata;
}) {
  const workflow = await getGalaxyAiWorkflow(input.workflowId);
  const nodeIds = new Set(parseWorkflowNodes(workflow).map((node) => node.id));
  const problems: string[] = [];

  if (input.metadata.requestNodeId && !nodeIds.has(input.metadata.requestNodeId)) {
    problems.push("request node missing");
  }
  if (input.metadata.imageNodeId && !nodeIds.has(input.metadata.imageNodeId)) {
    problems.push("image node missing");
  }
  if (input.kind === "vip_social_image_video" && input.metadata.videoNodeId && !nodeIds.has(input.metadata.videoNodeId)) {
    problems.push("video node missing");
  }

  if (!input.metadata.inputMapping.nodeRequestKey || !input.metadata.inputMapping.promptFieldName) {
    problems.push("input mapping missing");
  }

  return {
    valid: problems.length === 0,
    workflow,
    problems,
  };
}

async function getSchemaForCandidate(candidate: CatalogCandidate) {
  const attempts = [candidate.schemaId, candidate.modelId].filter(Boolean) as string[];
  const errors: string[] = [];

  for (const id of attempts) {
    try {
      const schema = await getGalaxyAiModelSchema(id);
      if (schema.length) {
        return schema;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unknown schema error for ${id}`);
    }
  }

  if (errors.length) {
    throw new Error(errors.join(" | "));
  }

  return [] as GalaxyAiModelSchemaField[];
}

async function createManagedWorkflow(input: {
  kind: VipManagedGalaxyWorkflowKind;
  imageCandidate: CatalogCandidate;
  imageSchema: GalaxyAiModelSchemaField[];
  videoCandidate: CatalogCandidate | null;
  videoSchema: GalaxyAiModelSchemaField[] | null;
  diagnostics: string[];
}) {
  const name = workflowName(input.kind);
  const description = workflowDescription(input.kind);

  const requestFields =
    input.kind === "vip_social_image_video"
      ? [
          { name: "image_prompt", type: "text", value: "" },
          { name: "video_prompt", type: "text", value: "" },
        ]
      : [{ name: "prompt", type: "text", value: "" }];

  const scaffold = await quickCreateGalaxyAiWorkflow({
    name,
    description,
    requestFields,
  });
  const workflow = await getGalaxyAiWorkflow(scaffold.id);
  const requestNode = findScaffoldNode(workflow, "request");
  const responseNode = findScaffoldNode(workflow, "response");

  if (!requestNode || !responseNode) {
    throw new Error("Magica did not return the expected Request/Response scaffold nodes.");
  }

  const requestHandle = requestFieldHandle(
    scaffold,
    requestNode,
    input.kind === "vip_social_image_video" ? "image_prompt" : "prompt",
  );
  const videoRequestHandle =
    input.kind === "vip_social_image_video"
      ? requestFieldHandle(scaffold, requestNode, "video_prompt")
      : null;

  if (!requestHandle) {
    throw new Error("Could not resolve the image prompt field ID on the Magica Request node.");
  }

  if (input.kind === "vip_social_image_video" && !videoRequestHandle) {
    throw new Error("Could not resolve the video prompt field ID on the Magica Request node.");
  }

  input.diagnostics.push(`Resolved Magica image Request field: ${requestHandle}.`);
  if (videoRequestHandle) {
    input.diagnostics.push(`Resolved Magica video Request field: ${videoRequestHandle}.`);
  }

  const imageInputs = buildImageNodeInputs(input.imageSchema);
  const imageNode = await addGalaxyAiWorkflowNode({
    workflowId: workflow.id,
    nodeType: input.imageCandidate.nodeType,
    mode: input.imageCandidate.executionMode,
    column: 1,
    row: 0,
    inputs: imageInputs,
  });

  const imagePromptHandle = nodeInputHandle(imageNode.raw, ["prompt", "text", "input"]);
  const imageResultHandle = nodeOutputHandle(imageNode.raw, ["result", "image", "output"]);

  if (!imagePromptHandle || !imageResultHandle) {
    throw new Error("Magica image node did not expose the expected prompt/result ports.");
  }

  await connectGalaxyAiWorkflowNodes({
    workflowId: workflow.id,
    sourceNodeId: requestNode.id,
    sourceHandle: requestHandle,
    targetNodeId: imageNode.id,
    targetHandle: imagePromptHandle,
  });

  let videoNodeId: string | null = null;
  let selectedVideoModel: string | null = null;
  let selectedVideoMode: string | null = null;

  if (input.kind === "vip_social_image_video") {
    if (!input.videoCandidate) {
      throw new Error("No suitable image-to-video Magica model was found.");
    }

    if (!input.videoSchema) {
      throw new Error("Magica image-to-video schema was not available after preflight.");
    }

    const videoInputs = buildVideoNodeInputs(input.videoSchema);
    const videoNode = await addGalaxyAiWorkflowNode({
      workflowId: workflow.id,
      nodeType: input.videoCandidate.nodeType,
      mode: input.videoCandidate.executionMode,
      column: 2,
      row: 0,
      inputs: videoInputs,
    });

    const videoImageHandle = nodeInputHandle(videoNode.raw, ["image", "reference", "image_url", "first_frame"]);
    const videoPromptHandle = nodeInputHandle(videoNode.raw, ["prompt", "text"]);
    const videoResultHandle = nodeOutputHandle(videoNode.raw, ["result", "video", "output"]);
    const responseHandle = responseInputHandle(responseNode);

    if (!videoImageHandle || !videoResultHandle) {
      throw new Error("Magica video node did not expose the expected image/result ports.");
    }

    await connectGalaxyAiWorkflowNodes({
      workflowId: workflow.id,
      sourceNodeId: imageNode.id,
      sourceHandle: imageResultHandle,
      targetNodeId: videoNode.id,
      targetHandle: videoImageHandle,
    });

    if (videoPromptHandle && videoRequestHandle) {
      await connectGalaxyAiWorkflowNodes({
        workflowId: workflow.id,
        sourceNodeId: requestNode.id,
        sourceHandle: videoRequestHandle,
        targetNodeId: videoNode.id,
        targetHandle: videoPromptHandle,
      });
    }

    if (responseHandle) {
      await connectGalaxyAiWorkflowNodes({
        workflowId: workflow.id,
        sourceNodeId: videoNode.id,
        sourceHandle: videoResultHandle,
        targetNodeId: responseNode.id,
        targetHandle: responseHandle,
      });
    }

    videoNodeId = videoNode.id;
    selectedVideoModel = input.videoCandidate.modelId;
    selectedVideoMode = input.videoCandidate.executionMode;
  } else {
    const responseHandle = responseInputHandle(responseNode);
    if (responseHandle) {
      await connectGalaxyAiWorkflowNodes({
        workflowId: workflow.id,
        sourceNodeId: imageNode.id,
        sourceHandle: imageResultHandle,
        targetNodeId: responseNode.id,
        targetHandle: responseHandle,
      });
    }
  }

  const verifiedWorkflow = await getGalaxyAiWorkflow(workflow.id);
  const vipMetadata: VipManagedGalaxyWorkflowMetadata = {
    managed: true,
    workflowKind: input.kind,
    recommendedAssetTypes: recommendedAssetTypes(input.kind),
    displayKind: displayKind(input.kind),
    inputMapping: {
      nodeRequestKey: requestNode.id,
      promptFieldName: requestHandle,
      requestFieldId: requestHandle,
      videoPromptFieldName: videoRequestHandle,
      videoRequestFieldId: videoRequestHandle,
    },
    requestNodeId: requestNode.id,
    responseNodeId: responseNode.id,
    imageNodeId: imageNode.id,
    videoNodeId,
    selectedImageModel: input.imageCandidate.modelId,
    selectedImageMode: input.imageCandidate.executionMode,
    selectedVideoModel,
    selectedVideoMode,
    verificationStatus: "verified",
    lastVerifiedAt: new Date().toISOString(),
    createdBy: "marketing_vip",
    templateVersion: "H1.10D5",
    createdAt: new Date().toISOString(),
    notes:
      input.kind === "vip_social_image_only"
        ? "Provisioned once and reused for approved social image prompts."
        : "Provisioned once with separate image and video prompt fields and reused for approved social image + video prompts.",
  };

  input.diagnostics.push(`Created ${displayKind(input.kind)} workflow ${verifiedWorkflow.id}.`);

  return {
    workflowId: verifiedWorkflow.id,
    name,
    description,
    kind: input.kind,
    metadata: toJson(mergeWorkflowMetadataWithVip(verifiedWorkflow, vipMetadata)),
  } satisfies ProvisionedGalaxyAiWorkflow;
}

export async function provisionVipGalaxyAiWorkflows(input?: {
  existingWorkflows?: ExistingWorkflowRef[];
  forceRebuild?: boolean;
}) {
  const diagnostics: string[] = [];
  const created: ProvisionedGalaxyAiWorkflow[] = [];
  const reused: ProvisionedGalaxyAiWorkflow[] = [];
  const catalog = await listGalaxyAiNodeCatalog();

  diagnostics.push(`Loaded ${catalog.length} Magica model entries.`);

  const imageCandidate = pickBestCatalogCandidate(catalog, "image");
  const videoCandidate = pickBestCatalogCandidate(catalog, "video");

  if (!imageCandidate) {
    throw new Error("Could not find a suitable Magica text-to-image model in the current catalog.");
  }

  diagnostics.push(
    `Selected image model: ${imageCandidate.modelName}${imageCandidate.modeName ? ` / ${imageCandidate.modeName}` : ""}; nodeType=${imageCandidate.nodeType}; mode=${imageCandidate.executionMode}; schema=${imageCandidate.schemaId}.`,
  );

  if (!videoCandidate) {
    throw new Error(
      "Could not find a Magica model whose live catalog mode is image-to-video. No workflow was created.",
    );
  }

  diagnostics.push(
    `Selected video model: ${videoCandidate.modelName}${videoCandidate.modeName ? ` / ${videoCandidate.modeName}` : ""}; nodeType=${videoCandidate.nodeType}; mode=${videoCandidate.executionMode}; schema=${videoCandidate.schemaId}.`,
  );

  // Complete live catalog/schema preflight before creating any remote workflow.
  const imageSchema = await getSchemaForCandidate(imageCandidate);
  if (!imageSchema.length) {
    throw new Error(
      `Magica preflight found ${imageCandidate.nodeType} in ${imageCandidate.executionMode} mode, but no input schema was returned for ${imageCandidate.schemaId}. No workflow was created.`,
    );
  }
  diagnostics.push(`Image schema preflight passed with ${imageSchema.length} field(s).`);

  const videoSchema = await getSchemaForCandidate(videoCandidate);
  if (!videoSchema.length) {
    throw new Error(
      `Magica preflight found ${videoCandidate.nodeType} in ${videoCandidate.executionMode} mode, but no input schema was returned for ${videoCandidate.schemaId}. No workflow was created.`,
    );
  }
  diagnostics.push(`Video schema preflight passed with ${videoSchema.length} field(s).`);

  const existingVipByKind = new Map<VipManagedGalaxyWorkflowKind, ExistingWorkflowRef>();
  for (const item of input?.existingWorkflows ?? []) {
    const vip = getVipManagedGalaxyWorkflowMetadata(item.metadata);
    if (vip?.workflowKind) {
      existingVipByKind.set(vip.workflowKind, item);
    }
  }

  for (const kind of ["vip_social_image_only", "vip_social_image_video"] as VipManagedGalaxyWorkflowKind[]) {
    const existing = existingVipByKind.get(kind);
    const existingVip = existing ? getVipManagedGalaxyWorkflowMetadata(existing.metadata) : null;

    if (existing && existingVip && !input?.forceRebuild) {
      try {
        const verification = await verifyManagedWorkflow({
          workflowId: existing.workflowId,
          kind,
          metadata: existingVip,
        });

        if (verification.valid) {
          const refreshedVip: VipManagedGalaxyWorkflowMetadata = {
            ...existingVip,
            verificationStatus: "verified",
            lastVerifiedAt: new Date().toISOString(),
            notes: existingVip.notes ?? "Existing Magica workflow verified and reused.",
          };

          diagnostics.push(`Reused existing ${displayKind(kind)} workflow ${existing.workflowId}.`);
          reused.push({
            workflowId: existing.workflowId,
            name: workflowName(kind),
            description: workflowDescription(kind),
            kind,
            metadata: toJson(mergeWorkflowMetadataWithVip(verification.workflow, refreshedVip)),
          });
          continue;
        }

        diagnostics.push(
          `Existing ${displayKind(kind)} workflow ${existing.workflowId} failed verification (${verification.problems.join(", ")}). Rebuilding.`,
        );
      } catch (error) {
        diagnostics.push(
          `Existing ${displayKind(kind)} workflow ${existing.workflowId} could not be verified. Rebuilding. ${error instanceof Error ? error.message : "Unknown verification error."}`,
        );
      }
    }

    created.push(
      await createManagedWorkflow({
        kind,
        imageCandidate,
        imageSchema,
        videoCandidate,
        videoSchema,
        diagnostics,
      }),
    );
  }

  return {
    created,
    reused,
    diagnostics,
    catalogCount: catalog.length,
    imageNode: `${imageCandidate.modelName}${imageCandidate.modeName ? ` / ${imageCandidate.modeName}` : ""} (${imageCandidate.executionMode})`,
    videoNode: `${videoCandidate.modelName}${videoCandidate.modeName ? ` / ${videoCandidate.modeName}` : ""} (${videoCandidate.executionMode})`,
  } satisfies GalaxyAiProvisioningResult;
}
