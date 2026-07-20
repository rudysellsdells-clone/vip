import assert from "node:assert/strict";
import test from "node:test";
import { prepareGalaxyAiRunInput } from "../src/lib/galaxyai/run-input.ts";
import {
  MAGICA_PROMPT_SAFE_LIMIT,
  MAGICA_VIDEO_PROMPT_SAFE_LIMIT,
} from "../src/lib/galaxyai/prompt-compactor.ts";

function managedMetadata(input: {
  kind: "vip_social_image_only" | "vip_social_image_video";
  promptFieldName: string;
  videoPromptFieldName?: string;
}) {
  return {
    vip: {
      managed: true,
      workflowKind: input.kind,
      recommendedAssetTypes:
        input.kind === "vip_social_image_video"
          ? ["galaxyai_prompt"]
          : ["galaxyai_image_prompt"],
      displayKind: "VIP managed workflow",
      inputMapping: {
        nodeRequestKey: "request-node",
        promptFieldName: input.promptFieldName,
        videoPromptFieldName: input.videoPromptFieldName ?? null,
      },
    },
  };
}

const oversizedPrompt = [
  "Create a polished social image and a 15-second video for local business owners.",
  "Campaign angle: Make the value of better visibility feel clear and practical.",
  "Creative direction: Show a confident owner reviewing a clean marketing dashboard.",
  "Motion direction: Use slow camera movement, subtle gestures, and a clean final hold.",
  "detail ".repeat(800),
].join("\n\n");

test("uses the Seedance-safe shared prompt for an existing one-field video workflow", () => {
  const result = prepareGalaxyAiRunInput({
    sourcePrompt: oversizedPrompt,
    workflowMetadata: managedMetadata({
      kind: "vip_social_image_video",
      promptFieldName: "field_prompt",
    }),
    assetType: "galaxyai_prompt",
  });

  assert.equal(result.sharedPromptMode, true);
  const sent = String(result.values["request-node"]?.field_prompt ?? "");
  assert.ok(sent.length <= MAGICA_VIDEO_PROMPT_SAFE_LIMIT);
  assert.equal(sent, result.videoPrompt?.prompt);
});

test("uses separate image and video prompts for a newly provisioned two-field workflow", () => {
  const result = prepareGalaxyAiRunInput({
    sourcePrompt: oversizedPrompt,
    workflowMetadata: managedMetadata({
      kind: "vip_social_image_video",
      promptFieldName: "field_image_prompt",
      videoPromptFieldName: "field_video_prompt",
    }),
    assetType: "galaxyai_prompt",
  });

  assert.equal(result.sharedPromptMode, false);
  const requestValues = result.values["request-node"] ?? {};
  const imagePrompt = String(requestValues.field_image_prompt ?? "");
  const videoPrompt = String(requestValues.field_video_prompt ?? "");

  assert.ok(imagePrompt.length <= MAGICA_PROMPT_SAFE_LIMIT);
  assert.ok(videoPrompt.length <= MAGICA_VIDEO_PROMPT_SAFE_LIMIT);
  assert.equal(imagePrompt, result.imagePrompt.prompt);
  assert.equal(videoPrompt, result.videoPrompt?.prompt);
});

test("keeps image-only workflows on the larger FLUX-safe limit", () => {
  const result = prepareGalaxyAiRunInput({
    sourcePrompt: oversizedPrompt,
    workflowMetadata: managedMetadata({
      kind: "vip_social_image_only",
      promptFieldName: "field_prompt",
    }),
    assetType: "galaxyai_image_prompt",
  });

  assert.equal(result.sharedPromptMode, false);
  assert.equal(result.videoPrompt, null);
  const sent = String(result.values["request-node"]?.field_prompt ?? "");
  assert.ok(sent.length <= MAGICA_PROMPT_SAFE_LIMIT);
  assert.equal(sent, result.imagePrompt.prompt);
});
