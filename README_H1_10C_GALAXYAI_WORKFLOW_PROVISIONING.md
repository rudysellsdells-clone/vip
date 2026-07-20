# H1.10C — GalaxyAI Workflow Provisioning

## Purpose

This patch adds a first-pass provisioning layer for GalaxyAI / Magica so Marketing VIP can create and register a current VIP-managed workflow pair directly from the app:

1. **Marketing VIP Social Image**
   - intended for `galaxyai_image_prompt`
   - creates a social-media-grade still image

2. **Marketing VIP Social Image + Video**
   - intended for `galaxyai_prompt`
   - creates a still image first, then a short video derived from that image and the approved VIP prompt

## What this patch adds

### 1. GalaxyAI provisioning button
A new button on `/galaxyai`:

- **Provision VIP Workflows**

This calls a new provisioning endpoint that:

- reads the live GalaxyAI node/model catalog
- chooses the best current image-generation node it can find
- chooses the best current video / image-to-video node it can find
- attempts to create the two VIP workflows
- stores them in `galaxyai_workflows`
- tags them as VIP-managed in metadata

### 2. Workflow metadata and input mapping
VIP-managed workflow metadata now stores:

- workflow kind
- recommended asset types
- selected image model
- selected video model
- input mapping

This removes the need to rely only on a hard-coded workflow-id map.

### 3. Run execution uses workflow metadata
When an approved GalaxyAI asset is run, VIP now:

- looks up the selected workflow record
- reads the VIP input mapping from workflow metadata when available
- builds the `values` payload accordingly

### 4. Sync preserves VIP metadata
Workflow sync now preserves VIP workflow metadata instead of wiping it out.

### 5. Better workflow selection in asset detail
On asset detail pages, the GalaxyAI run selector now:

- shows VIP-managed workflow labels
- defaults toward the recommended workflow kind for the asset type

## Files included

```text
README_H1_10C_GALAXYAI_WORKFLOW_PROVISIONING.md
src/app/(app)/assets/[assetId]/page.tsx
src/app/(app)/galaxyai/page.tsx
src/app/api/galaxyai/runs/route.ts
src/app/api/galaxyai/workflows/provision/route.ts
src/app/api/galaxyai/workflows/route.ts
src/components/galaxyai/ProvisionGalaxyAiWorkflowsButton.tsx
src/components/galaxyai/RunGalaxyAiAssetButton.tsx
src/lib/galaxyai/client.ts
src/lib/galaxyai/provisioning.ts
src/lib/galaxyai/types.ts
src/lib/galaxyai/workflow-metadata.ts
```

## Important note

Because GalaxyAI / Magica changes models and workflow schemas over time, this patch is intentionally **best-effort and catalog-driven**.

It attempts multiple known workflow creation endpoint patterns and stores diagnostics when provisioning fails.

If GalaxyAI has changed their create-workflow payload format again, the button should now give much more actionable error output than the earlier stale-node experience.

## Apply instructions

Unzip this patch directly into the repo root and allow file replacement.

Then:

1. commit locally
2. push to GitHub
3. let Vercel rebuild
4. open `/galaxyai`
5. click **Provision VIP Workflows**
6. if needed, click **Sync Workflows**
7. run an approved `galaxyai_image_prompt`
8. run an approved `galaxyai_prompt`

## Suggested commit message

```text
Add GalaxyAI workflow provisioning and VIP-managed mappings
```
