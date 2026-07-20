import {
  compactMagicaPrompt,
  MAGICA_PROMPT_SAFE_LIMIT,
  MAGICA_VIDEO_PROMPT_SAFE_LIMIT,
  type CompactMagicaPromptResult,
} from "./prompt-compactor.ts";
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

  const imagePrompt = compactMagicaPrompt(
    input.sourcePrompt,
    MAGICA_PROMPT_SAFE_LIMIT,
  );
  const videoPrompt = isVideoWorkflow
    ? compactMagicaPrompt(input.sourcePrompt, MAGICA_VIDEO_PROMPT_SAFE_LIMIT)
    : null;

  if (workflowMetadata?.inputMapping) {
    const mapping = workflowMetadata.inputMapping;
    const requestValues: Record<string, unknown> = {};
    const hasSeparateVideoField = Boolean(mapping.videoPromptFieldName);
    const sharedPromptMode = isVideoWorkflow && !hasSeparateVideoField;

    requestValues[mapping.promptFieldName] = sharedPromptMode
      ? videoPrompt?.prompt ?? imagePrompt.prompt
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
      sharedPromptMode,
    };
  }

  const fallbackPrompt = videoPrompt?.prompt ?? imagePrompt.prompt;

  return {
    values: {
      prompt: {
        prompt: fallbackPrompt,
      },
    },
    workflowMetadata,
    imagePrompt,
    videoPrompt,
    sharedPromptMode: isVideoWorkflow,
  };
}
