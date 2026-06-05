# VIP Phase 3G.4 Run GalaxyAI Image Prompts Patch

## Purpose

This patch makes the new `galaxyai_image_prompt` assets actionable.

Phase 3G.3 created campaign visual directions and companion GalaxyAI image prompts for LinkedIn/Facebook posts. Phase 3G.4 lets approved image prompts run through the existing GalaxyAI workflow lane.

## What this patch does

### 1. Allows image prompts to run through GalaxyAI

The GalaxyAI run API now accepts approved assets with either:

```text
galaxyai_prompt
galaxyai_image_prompt
```

The original safety gate remains in place: the asset must still be approved before it can run.

### 2. Adds GalaxyAI workflow controls to asset detail pages

On:

```text
/assets/[assetId]
```

Approved `galaxyai_prompt` and `galaxyai_image_prompt` assets now show the GalaxyAI workflow selector/run button.

### 3. Adds image prompts to ready routing

`galaxyai_image_prompt` is now included in ready-for-publishing routing labels and next-step messaging.

### 4. Keeps this review-first

This patch does not publish images automatically and does not attach images to social posts yet.

The next phase should be:

```text
GalaxyAI completed output
→ Extract generated image URL
→ Upload/copy image into Supabase Storage
→ Store hosted image URL on the prompt/parent social asset
→ Attach hosted image file to Facebook/LinkedIn publish payload
```

## Files included

```text
src/app/api/galaxyai/runs/route.ts
src/app/(app)/assets/[assetId]/page.tsx
src/app/(app)/ready-for-publishing/page.tsx
src/components/galaxyai/RunGalaxyAiAssetButton.tsx
src/components/publishing/ExecuteApprovedAssetButton.tsx
src/components/ready-for-publishing/ReadyAssetActions.tsx
src/lib/publishing/asset-routing.ts
src/lib/publishing/ready-routing.ts
src/types/asset.ts
```

## No SQL migration needed

This uses existing `generated_assets` and `galaxyai_runs` records.

## Test checklist

1. Generate a monthly campaign with Phase 3G.3 applied.
2. Approve a `galaxyai_image_prompt` asset.
3. Open the asset detail page.
4. Confirm a GalaxyAI workflow selector appears.
5. Run the approved prompt.
6. Confirm a row appears in `galaxyai_runs`.
7. Confirm the GalaxyAI page shows the queued/running/completed run.

## Suggested commit message

```text
Allow approved GalaxyAI image prompts to run
```
