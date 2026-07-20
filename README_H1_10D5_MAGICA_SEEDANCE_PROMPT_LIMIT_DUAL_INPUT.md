# H1.10D5 — Magica Seedance Prompt Limit + Dual Input

## Problem fixed

The existing image + video Magica workflow sends one shared prompt to both FLUX and Seedance.

FLUX accepts up to 3,500 characters, while the selected Seedance image-to-video node accepts no more than 2,500 characters. VIP was sending the FLUX-safe 3,400-character prompt to Seedance, causing:

`Too big: expected string to have <=2500 characters`

## Immediate behavior for the existing workflow

No workflow rebuild is required.

For the currently provisioned one-field image + video workflow, VIP now sends a Seedance-safe shared execution prompt capped at **2,400 characters**. This keeps the request below Seedance's 2,500-character hard limit while preserving a safety margin.

Image-only workflows continue using the richer FLUX-safe prompt capped at **3,400 characters**.

## Improved behavior for future workflow rebuilds

Newly provisioned image + video workflows now use two Request fields:

- `image_prompt` — detailed FLUX prompt, capped at 3,400 characters
- `video_prompt` — concise Seedance prompt, capped at 2,400 characters

The image field connects only to the FLUX prompt input. The video field connects only to the Seedance prompt input.

This avoids forcing both models to share the stricter prompt limit after a future rebuild.

## Compatibility

The run-input layer supports both workflow generations:

- existing one-field workflow: safe shared 2,400-character prompt
- new two-field workflow: separate image and video prompts

Your existing 15-second video duration is not changed by this patch.

## Validation completed

- 4 prompt-compactor tests passed
- 3 run-input compatibility tests passed
- 3 GalaxyAI output-recovery tests passed
- targeted strict TypeScript checks passed for the changed Magica modules
- direct-root ZIP structure verified

## Installation

Extract the ZIP directly into the VIP repository root and choose **Replace**.

Do not provision again solely for this error. Deploy the patch and rerun the approved asset. A later intentional workflow rebuild will adopt the separate prompt fields automatically.
