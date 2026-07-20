import {
  createGalaxyAiWorkflowWithFallback,
  listGalaxyAiNodeCatalog,
} from "@/lib/galaxyai/client";
import type { GalaxyAiCatalogNode } from "@/lib/galaxyai/types";
import type { Json } from "@/types/database.types";
import type { VipManagedGalaxyWorkflowKind } from "@/lib/galaxyai/workflow-metadata";
import { mergeWorkflowMetadataWithVip } from "@/lib/galaxyai/workflow-metadata";

export type ProvisionedGalaxyAiWorkflow = {
  workflowId: string;
  name: string;
  description: string;
  kind: VipManagedGalaxyWorkflowKind;
  metadata: Json;
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function scoreNode(node: GalaxyAiCatalogNode, kind: "image" | "video") {
  const haystack = [node.id, node.name, node.type, node.slug, node.description, node.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  if (kind === "image") {
    if (haystack.includes("gpt image 2")) score += 18;
    if (haystack.includes("flux 2 max")) score += 16;
    if (haystack.includes("flux")) score += 10;
    if (haystack.includes("image")) score += 8;
    if (haystack.includes("text-to-image")) score += 8;
    if (haystack.includes("video")) score -= 14;
    if (haystack.includes("audio")) score -= 10;
  } else {
    if (haystack.includes("seedance 2.0 fast reference")) score += 20;
    if (haystack.includes("seedance")) score += 16;
    if (haystack.includes("image to video")) score += 14;
    if (haystack.includes("reference")) score += 8;
    if (haystack.includes("video")) score += 8;
    if (haystack.includes("audio")) score -= 10;
  }

  return score;
}

function pickBestNode(nodes: GalaxyAiCatalogNode[], kind: "image" | "video") {
  const candidates = nodes
    .map((node) => ({ node, score: scoreNode(node, kind) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.node ?? null;
}

function buildInputMapping() {
  return {
    nodeRequestKey: "vip_prompt_request",
    promptFieldName: "VIP Prompt",
  };
}

function buildManagedWorkflowPayload(input: {
  kind: VipManagedGalaxyWorkflowKind;
  name: string;
  description: string;
  imageNode: GalaxyAiCatalogNode;
  videoNode?: GalaxyAiCatalogNode | null;
}) {
  const promptExpression = "{{vip_prompt_request.VIP Prompt}}";
  const baseNodes = [
    {
      id: "vip_prompt_request",
      type: "request",
      name: "VIP Prompt Input",
      label: "VIP Prompt Input",
      data: {
        requestKey: "vip_prompt_request",
        fields: [{ name: "VIP Prompt", key: "VIP Prompt", type: "text", required: true }],
      },
    },
    {
      id: "vip_social_image",
      type: input.imageNode.type ?? input.imageNode.id ?? input.imageNode.slug ?? "image_generation",
      name: "Social Image Generation",
      label: "Social Image Generation",
      data: {
        modelId: input.imageNode.id ?? input.imageNode.slug ?? input.imageNode.type,
        prompt: promptExpression,
        inputs: {
          prompt: promptExpression,
          aspectRatio: "4:5",
          count: 1,
          quality: "high",
          style:
            "Create a polished social media grade visual with clean composition, brand-safe business styling, realistic imagery, and minimal readable text.",
        },
      },
    },
  ];

  const baseEdges = [
    {
      id: "edge_prompt_to_image",
      source: "vip_prompt_request",
      sourceHandle: "VIP Prompt",
      target: "vip_social_image",
      targetHandle: "prompt",
    },
  ];

  const outputs: Array<Record<string, unknown>> = [
    {
      id: "output_image",
      sourceNodeId: "vip_social_image",
      label: "Generated social image",
      type: "image",
    },
  ];

  const nodes = [...baseNodes];
  const edges = [...baseEdges];

  if (input.kind === "vip_social_image_video" && input.videoNode) {
    nodes.push({
      id: "vip_social_video",
      type: input.videoNode.type ?? input.videoNode.id ?? input.videoNode.slug ?? "video_generation",
      name: "Social Video Generation",
      label: "Social Video Generation",
      data: {
        modelId: input.videoNode.id ?? input.videoNode.slug ?? input.videoNode.type,
        prompt: `${promptExpression}\n\nAnimate the generated image into a short 5-second marketing video with subtle motion, clean transitions, and realistic movement.`,
        inputs: {
          prompt: `${promptExpression}\n\nAnimate the generated image into a short 5-second marketing video with subtle motion, clean transitions, and realistic movement.`,
          referenceImage: "{{vip_social_image.output}}",
          image: "{{vip_social_image.output}}",
          durationSeconds: 5,
          resolution: "720p",
          motionStyle: "subtle",
        },
      },
    });

    edges.push(
      {
        id: "edge_prompt_to_video",
        source: "vip_prompt_request",
        sourceHandle: "VIP Prompt",
        target: "vip_social_video",
        targetHandle: "prompt",
      },
      {
        id: "edge_image_to_video",
        source: "vip_social_image",
        sourceHandle: "output",
        target: "vip_social_video",
        targetHandle: "image",
      },
    );

    outputs.push({
      id: "output_video",
      sourceNodeId: "vip_social_video",
      label: "Generated social video",
      type: "video",
    });
  }

  return {
    name: input.name,
    description: input.description,
    metadata: {
      createdBy: "Marketing VIP",
      templateVersion: "H1.10C",
      workflowKind: input.kind,
    },
    requestSchema: {
      requestKey: "vip_prompt_request",
      fields: [{ name: "VIP Prompt", type: "text", required: true }],
    },
    nodes,
    edges,
    outputs,
    template: {
      requestNodeId: "vip_prompt_request",
      primaryImageNodeId: "vip_social_image",
      primaryVideoNodeId: input.kind === "vip_social_image_video" ? "vip_social_video" : null,
    },
  };
}

function buildLocalWorkflowMetadata(input: {
  kind: VipManagedGalaxyWorkflowKind;
  remoteWorkflow: unknown;
  imageNode: GalaxyAiCatalogNode;
  videoNode?: GalaxyAiCatalogNode | null;
}) {
  const vipMetadata = {
    managed: true,
    workflowKind: input.kind,
    recommendedAssetTypes:
      input.kind === "vip_social_image_video"
        ? ["galaxyai_prompt"]
        : ["galaxyai_image_prompt"],
    displayKind:
      input.kind === "vip_social_image_video"
        ? "VIP social image + video workflow"
        : "VIP social image workflow",
    inputMapping: buildInputMapping(),
    createdBy: "Marketing VIP",
    templateVersion: "H1.10C",
    selectedImageModel:
      input.imageNode.name ?? input.imageNode.id ?? input.imageNode.slug ?? input.imageNode.type,
    selectedVideoModel:
      input.videoNode
        ? input.videoNode.name ?? input.videoNode.id ?? input.videoNode.slug ?? input.videoNode.type
        : null,
    createdAt: new Date().toISOString(),
    notes:
      input.kind === "vip_social_image_video"
        ? "Creates a social image, then animates it into a short video."
        : "Creates a social media grade still image.",
  };

  return mergeWorkflowMetadataWithVip(input.remoteWorkflow, vipMetadata) as Json;
}

export async function provisionVipGalaxyAiWorkflows() {
  const catalog = await listGalaxyAiNodeCatalog();
  const imageNode = pickBestNode(catalog, "image");
  const videoNode = pickBestNode(catalog, "video");

  if (!imageNode) {
    throw new Error("GalaxyAI provisioning could not find a supported image-generation node in the live catalog.");
  }

  if (!videoNode) {
    throw new Error("GalaxyAI provisioning could not find a supported image-to-video node in the live catalog.");
  }

  const plans = [
    {
      kind: "vip_social_image_only" as const,
      name: "Marketing VIP Social Image",
      description:
        "Creates a polished social media grade still image from the approved Marketing VIP prompt.",
      videoNode: null,
    },
    {
      kind: "vip_social_image_video" as const,
      name: "Marketing VIP Social Image + Video",
      description:
        "Creates a polished social image and then a short marketing video derived from that image and the approved Marketing VIP prompt.",
      videoNode,
    },
  ];

  const created: ProvisionedGalaxyAiWorkflow[] = [];
  const diagnostics: string[] = [];

  for (const plan of plans) {
    try {
      const payload = buildManagedWorkflowPayload({
        kind: plan.kind,
        name: plan.name,
        description: plan.description,
        imageNode,
        videoNode: plan.videoNode,
      });

      const createdWorkflow = await createGalaxyAiWorkflowWithFallback({
        name: plan.name,
        description: plan.description,
        payload,
      });

      created.push({
        workflowId: createdWorkflow.workflowId,
        name: plan.name,
        description: plan.description,
        kind: plan.kind,
        metadata: buildLocalWorkflowMetadata({
          kind: plan.kind,
          remoteWorkflow: createdWorkflow.raw,
          imageNode,
          videoNode: plan.videoNode,
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown GalaxyAI provisioning error.";
      diagnostics.push(`${plan.name}: ${message}`);
    }
  }

  return {
    catalogCount: catalog.length,
    imageNode,
    videoNode,
    created,
    diagnostics,
  };
}
