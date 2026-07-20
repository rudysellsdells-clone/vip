# H1.10D — Magica Workflow Provisioning Reuse

## What this patch does

This patch changes the Marketing VIP ↔ Magica integration from a fragile "build workflow every time" pattern into the intended architecture:

1. **Provision the VIP-managed Magica workflows once per workspace**
2. **Verify and reuse those workflows on future requests**
3. **Run approved prompts against the saved workflow IDs**
4. **Do not recreate nodes, edges, or workflow definitions on normal asset generation**

## Included improvements

- Adds a more complete Magica client layer for:
  - listing models/catalog
  - reading model schema
  - quick-creating workflows
  - fetching workflow details
  - adding nodes
  - connecting edges
- Provisions two reusable VIP-managed workflows:
  - **Marketing VIP Social Image**
  - **Marketing VIP Social Image + Video**
- Saves richer VIP workflow metadata including:
  - request node id
  - response node id
  - image node id
  - video node id
  - prompt field mapping
  - selected model / mode ids
  - verification status and timestamps
- Changes provisioning behavior so VIP will:
  - verify an existing managed workflow first
  - reuse it if healthy
  - rebuild only when needed
- Updates the provisioning UI message so it clearly indicates whether VIP:
  - created workflows
  - reused workflows
  - or both
- Updates the Galaxy/Magica page copy to reflect the one-time provisioning model.

## Important behavior change

After this patch, provisioning is **workspace setup**, not per-request execution.

That means an approved asset prompt should only start a **new run** against a saved workflow, not rebuild the workflow definition.

## Environment variables

This patch supports either naming style:

- `MAGICA_API_KEY`
- `GALAXYAI_API_KEY`

Optional API base URL overrides:

- `MAGICA_API_BASE_URL`
- `GALAXYAI_API_BASE_URL`

Default base URL used by the client:

- `https://api.magica.com/api`

## No schema migration required

This patch uses the existing `galaxyai_workflows` table and stores the richer managed-workflow state in `metadata`.

## Recommended QA

1. Open **GalaxyAI / Magica** in VIP
2. Click **Provision / Verify VIP Workflows**
3. Confirm you get either:
   - a creation success message, or
   - a verified/reused success message
4. Confirm both workflows appear in the workspace workflow list
5. Approve a `galaxyai_image_prompt` asset and run it
6. Approve a `galaxyai_prompt` asset and run it
7. Confirm the run record is created and output recovery still works

## Files included

See `PATCH_MANIFEST_H1_10D.txt`.
