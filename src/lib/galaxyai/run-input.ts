import type { CompactMagicaPromptResult } from "./prompt-compactor.ts";
import {
  buildMagicaImageExecutionPrompt,
  buildMagicaSharedExecutionPrompt,
  buildMagicaVideoExecutionPrompt,
} from "./quality-prompt.ts";
import {
  getVipManagedGalaxyWorkflowMetadata,
  type VipManagedGalaxyWorkflowMetadata,
} from "./workflow-metadata.ts";

export type GalaxyAiRunValues = Record<string, Record<string, unknown>>;

export type PreparedGalaxyAiRunInput = {
  values: GalaxyAiRunValues;
  workflowMetadata: VipManagedGalaxyWorkflowMetadata | null;
  imagePrompt: CompactMagicaPromptResult;
  videoPrompt: CompactMagicaPromptResult | null;
  sharedPrompt: CompactMagicaPromptResult | null;
  sharedPromptMode: boolean;
};

export function prepareGalaxyAiRunInput(input: {
  sourcePrompt: unknown;
  workflowMetadata: unknown;
  assetType: string | null | undefined;
}): PreparedGalaxyAiRunInput {
  const workflowMetadata = getVipManagedGalaxyWorkflowMetadata(
    input.workflowMetadata,
  );
  const isVideoWorkflow =
    workflowMetadata?.workflowKind === "vip_social_image_video" ||
    input.assetType === "galaxyai_prompt";

  const imagePrompt = buildMagicaImageExecutionPrompt(input.sourcePrompt);
  const videoPrompt = isVideoWorkflow
    ? buildMagicaVideoExecutionPrompt(input.sourcePrompt)
    : null;

  if (workflowMetadata?.inputMapping) {
    const mapping = workflowMetadata.inputMapping;
    const requestValues: Record<string, unknown> = {};
    const hasSeparateVideoField = Boolean(mapping.videoPromptFieldName);
    const sharedPromptMode = isVideoWorkflow && !hasSeparateVideoField;
    const sharedPrompt = sharedPromptMode
      ? buildMagicaSharedExecutionPrompt(input.sourcePrompt)
      : null;

    requestValues[mapping.promptFieldName] = sharedPromptMode
      ? sharedPrompt?.prompt ?? imagePrompt.prompt
      : imagePrompt.prompt;

    if (isVideoWorkflow && mapping.videoPromptFieldName) {
      requestValues[mapping.videoPromptFieldName] =
        videoPrompt?.prompt ?? imagePrompt.prompt;
    }

    return {
      values: {
        [mapping.nodeRequestKey]: requestValues,
      },
      workflowMetadata,
      imagePrompt,
      videoPrompt,
      sharedPrompt,
      sharedPromptMode,
    };
  }

  const sharedPrompt = isVideoWorkflow
    ? buildMagicaSharedExecutionPrompt(input.sourcePrompt)
    : null;
  const fallbackPrompt = sharedPrompt?.prompt ?? imagePrompt.prompt;

  return {
    values: {
      prompt: {
        prompt: fallbackPrompt,
      },
    },
    workflowMetadata,
    imagePrompt,
    videoPrompt,
    sharedPrompt,
    sharedPromptMode: isVideoWorkflow,
  };
}
